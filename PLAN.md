# PLAN.md — Plan de Arquitectura: Pomodoro Web

Documento de arquitectura y decisiones de diseño para la aplicación **Pomodoro** desarrollada exclusivamente con la pila web estándar (HTML5, CSS3, JavaScript Vanilla), sin frameworks ni librerías externas.

---

## 1. Visión general

Temporizador basado en la técnica Pomodoro con **cuatro métodos de temporización seleccionables**, ciclos de **Trabajo / Descanso corto / Descanso largo**, controles Iniciar/Pausar/Reiniciar, notificaciones sonoras y visuales al finalizar cada ciclo, contador de pomodoros **independiente por método** (persistente) e interfaz responsive bilingüe (ES/EN) con emojis integrados.

## 2. Decisiones de stack

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Scripts clásicos (`<script>` en orden) | Módulos ES | Los módulos fallan por CORS al abrir `index.html` vía `file://`; con scripts clásicos la app funciona con doble clic, sin servidor local |
| Patrón módulo revelador + IIFE | Clases / frameworks | Encapsulación simple sin dependencias; un objeto global por archivo |
| Bus de eventos sobre `CustomEvent` en `document` | Callbacks anidados | Desacopla `timer` → `app` (p. ej. `timer:expired`) sin acoplamiento directo |
| `setInterval(250ms)` + cálculo por `Date.now()` | `setTimeout(1000)` decremental | Compensa el *drift* del temporizador y el *throttling* de pestañas en segundo plano |
| Web Audio API (osciladores) | `<audio>` con archivos mp3 | Cero assets externos; beeps sintetizados programáticamente |
| Favicon pintado con `<canvas>` (emoji + círculo) | Archivos .ico estáticos | El favicon refleja fase y color del modo, sin archivos extra |
| Presets de método en constante `METHODS` | Configuración externa / BD | Un único punto de ajuste (`js/state.js`), sin backend ni parsing |
| Contadores por método en un solo objeto JSON | Una clave por método | Menos claves, lectura/escritura atómica, fácil migración |
| `localStorage` para método/contadores/idioma/notificaciones | Solo memoria | Requisito acordado: todo sobrevive recargas |

## 3. Estructura de archivos

```
Pomodoro-Modo-Plan-main/
├── index.html          → Vista: semántica HTML5, data-i18n, aria-*, navs de métodos y fases
├── PLAN.md             → Este documento
├── README.md           → Descripción + historial de prompts
├── css/
│   └── styles.css      → Mobile-first, custom properties por modo, chips y píldoras
└── js/
    ├── state.js        → Estado central, METHODS, pub/sub, persistencia, bus de eventos
    ├── i18n.js         → Diccionario ES/EN (con emojis) + aplicación de textos
    ├── audio.js        → Síntesis de beeps (Web Audio API)
    ├── notify.js       → Título de pestaña, favicon emoji+color, Notification API
    ├── timer.js        → Máquina de cuenta regresiva (drift-compensated)
    └── app.js          → Controlador: wiring DOM ↔ estado ↔ eventos + filtrado ARIA
```

### Responsabilidades

| Archivo | Responsabilidad única |
|---|---|
| `state.js` | Fuente de verdad: `methodKey`, `mode`, `timeLeft`, `isRunning`, `completedByMethod`. Publica snapshots a suscriptores. Define `PomodoroEvents`. |
| `i18n.js` | Traducción con emojis incluidos en los strings; `t(key, params)`; aplica a `[data-i18n]` / `[data-i18n-aria]`; persiste idioma. |
| `audio.js` | Sonido: patrones ascendentes (fin de trabajo) y descendentes (fin de descanso); desbloqueo del `AudioContext` con el primer gesto. |
| `notify.js` | Título `⏰ MM:SS · Modo` en marcha; favicon = emoji de fase sobre círculo del color del modo; Notification API solo con pestaña oculta. |
| `timer.js` | Tiempo: `start/pause/reset/toggle` con deadline absoluto; emite `timer:expired`. |
| `app.js` | Render: snapshot → DOM; selector de métodos y fases; limpia emojis de los `aria-label` (regex `\p{Extended_Pictographic}`) para lectores de pantalla. |

## 4. Métodos de temporización (v2)

Centralizados en `PomodoroState.METHODS`:

| Key | Trabajo | Corto | Largo | Largo cada | Emoji UI |
|---|---|---|---|---|---|
| `classic` | 25 min | 5 min | 15 min | 4 | 🍅 |
| `deep50` | 50 min | 10 min | 30 min | 2 | ⚡ |
| `rule5217` | 52 min | 17 min | 25 min | 2 | ⏳ |
| `ultradian` | 90 min | 20 min | 20 min | 2 | 🧠 |

> Los valores de descanso largo de métodos no clásicos son una propuesta razonable (la técnica original no los define); se editan en un único lugar.

Emojis por **fase** (independientes del método): trabajo 🔥 · corto ☕ · largo 🏖️.

Al cambiar de método: el temporizador se detiene/reinicia y arranca en fase Work a duración completa; el método activo se persiste.

## 5. Modelo de estado

```js
{
  methodKey: 'classic' | 'deep50' | 'rule5217' | 'ultradian',
  method: { durations: {work, short, long}, longBreakEvery },
  mode: 'work' | 'short' | 'long',
  timeLeft: number,
  total: number,
  isRunning: boolean,
  completedPomodoros: number,   // del método activo
  longBreakEvery: number
}
```

Flujo unidireccional:

```
        clic usuario                        render(snapshot)
┌───────────────────────┐   comandos    ┌─────────────────────────┐
│ index.html (Vista)    │ ────────────▶ │ app.js (Controlador)    │
│ chips, fases, botones │ ◀──────────── │ suscriptor del estado   │
└───────────────────────┘               └───────────┬─────────────┘
                                                    │
              ┌─────────────────┬───────────────────┼──────────────────┐
              ▼                 ▼                   ▼                  ▼
        ┌───────────┐    ┌───────────┐      ┌─────────────┐   ┌──────────────┐
        │ state.js  │    │ timer.js  │      │   i18n.js   │   │ audio/notify │
        │ pub/sub   │    │ deadlines │      │ diccionario │   │ efectos      │
        └─────┬─────┘    └─────┬─────┘      └─────────────┘   └──────────────┘
              │                │ emite 'timer:expired'
     localStorage              ▼
              │        app.handleExpired():
              ▼        +1 pomodoro (método activo) → sonido → siguiente fase → estado
        persistencia
```

### Transición de fases (al expirar)

```
work ──▶ (completedPomodoros % longBreakEvery === 0) ? long : short
short ──▶ work
long ──▶ work
```

El avance automático deja la siguiente fase **en pausa** a duración completa: el usuario decide cuándo continuar. `longBreakEvery` proviene del método activo.

## 6. Estrategia de temporización

- Se guarda un **deadline absoluto** (`deadline = Date.now() + timeLeft*1000`) al iniciar.
- Cada tick (250 ms) recalcula `restante = ceil((deadline - Date.now()) / 1000)`.
- Beneficios:
  - Sin acumulación de error por ticks retrasados (*drift compensation*).
  - Pausar = detener intervalo y conservar `timeLeft`; reanudar recalcula el deadline.
- Limitación conocida: en pestañas ocultas los navegadores limitan `setInterval` a ~1 Hz; la expiración puede dispararse hasta ~1 s tarde (el tiempo mostrado sigue siendo correcto). Mejora futura: mover el tick a un *Web Worker*.

## 7. Persistencia (localStorage)

| Clave | Contenido |
|---|---|
| `pomodoro.method` | Método activo (`classic` \| `deep50` \| `rule5217` \| `ultradian`) |
| `pomodoro.completed-by-method` | JSON `{ "classic": n, "deep50": n, "rule5217": n, "ultradian": n }` |
| `pomodoro.language` | Idioma activo (`es` \| `en`) |
| `pomodoro.notifications-enabled` | Preferencia de notificaciones del navegador |

**Migración v1→v2:** si no existe `completed-by-method` pero sí la clave legacy `pomodoro.completed-count`, su valor se siembra como contador del método clásico. Todos los accesos están envueltos en `try/catch` para tolerar modo privado o almacenamiento bloqueado.

## 8. Notificaciones al finalizar ciclo

1. **Sonora**: 3 tonos ascendentes (fin de trabajo) u 2 descendentes (fin de descanso), sintetizados con osciladores + envolvente de ganancia.
2. **Visual en interfaz**: tema por fase (rojo/trabajo, turquesa/corto, azul/largo) vía CSS custom properties; anillo SVG se reinicia.
3. **Título de pestaña**: plantilla i18n `⏰ {time} · {modo}` mientras corre; se restaura al pausar.
4. **Favicon dinámico**: emoji de la fase dibujado en `<canvas>` sobre círculo del color profundo del modo.
5. **Notification API** (opcional): botón campana; solo se muestra con pestaña oculta (`document.hidden`) y permiso concedido.
6. **Región `aria-live`**: anuncia el cambio de fase para lectores de pantalla.

## 9. Internacionalización

- Diccionarios `es` / `en`; español por defecto; **emojis viven dentro del diccionario** para consistencia entre idiomas.
- Estáticos: `data-i18n="clave"` / `data-i18n-aria="clave"`.
- Dinámicos: etiqueta Iniciar/Pausar, fase actual, título (`titleRunning` con placeholders `{time}`/`{mode}`), hint de descanso largo (`{total}`), dots (`{done}`/`{total}`).
- Botón idioma alterna ES↔EN, actualiza `<html lang>` y persiste.

## 10. Emojis y accesibilidad

- Emojis visibles en: cabecera, chips de método, fases, botones (▶️ ⏸️ 🔄), contador 🍅, hint 🛋️, título de pestaña ⏰ y favicon.
- Los `aria-label` calculados (chips, fases, reloj) pasan por `stripEmojis()` (regex Unicode `\p{Extended_Pictographic}` + VS16 + ZWJ) para que los lectores de pantalla no deletren pictogramas.
- Los textos de notificaciones usan signos (¡!) en lugar de emojis para máxima compatibilidad del SO.

## 11. Checklist de accesibilidad

- [x] Semántica HTML5: `header`, dos `nav` (métodos/fases) etiquetadas, secciones con `aria-label`, `footer`.
- [x] Reloj con `role="timer"` y `aria-label` descriptivo sin emojis.
- [x] Región `role="status"` + `aria-live="assertive"` solo para cambios de fase.
- [x] Botones con `aria-pressed` (chips, fases, campana) y áreas táctiles ≥ 44 px.
- [x] `:focus-visible` con acento del modo activo; contraste AA en texto principal/secundario.
- [x] `prefers-reduced-motion`: transiciones anuladas.
- [x] SVG decorativos con `aria-hidden="true"` y `focusable="false"`; dots como `role="img"` con `aria-label` calculada.
- [x] Emojis filtrados de todos los `aria-label` dinámicos.

## 12. UI/UX

- **Mobile-first**: base ~320 px; `clamp()` progresivo; media query ≥ 560 px; ajuste tipográfico ≤ 360 px.
- Fila superior: chips de método (wrap centrado). Debajo: segment control de fases. Ambos comparten patrón visual de píldora.
- Anillo de progreso SVG (`stroke-dashoffset` proporcional al transcurrido).
- Temas por fase vía `body[data-mode]` → `--accent` / `--accent-deep`; los chips activos heredan ese acento.
- Tipografía numérica tabular para estabilidad visual del reloj.

## 13. Fases de implementación

| Fase | Estado |
|---|---|
| Estructura base (HTML semántico + layout responsive) | ✅ |
| Estado central + persistencia | ✅ |
| Temporizador con compensación de drift | ✅ |
| Audio con Web Audio API | ✅ |
| Notificaciones visuales (tema, título, favicon, Notification API) | ✅ |
| Contador persistente + indicador de superciclo | ✅ |
| i18n ES/EN | ✅ |
| Accesibilidad base (roles, live regions, contraste, reduced motion) | ✅ |
| **v2:** 4 métodos de temporización seleccionables | ✅ |
| **v2:** contador independiente por método + migración legacy | ✅ |
| **v2:** emojis en toda la UI + favicon emoji + aria limpio | ✅ |

## 14. Mejoras futuras (backlog)

- Web Worker para precisión de expiración en segundo plano.
- Auto-inicio opcional del siguiente ciclo (ajuste configurable).
- Duraciones personalizadas por el usuario (además de los presets).
- Atajos de teclado (espacio = iniciar/pausar, R = reiniciar).
- PWA: manifest + service worker para instalación offline.
- Estadísticas históricas por método (gráfico simple en canvas).

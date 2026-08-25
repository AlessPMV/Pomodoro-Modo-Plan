# PLAN.md — Plan de Arquitectura: Pomodoro Web

Documento de arquitectura y decisiones de diseño para la aplicación **Pomodoro** desarrollada exclusivamente con la pila web estándar (HTML5, CSS3, JavaScript Vanilla), sin frameworks ni librerías externas.

---

## 1. Visión general

Temporizador basado en la técnica Pomodoro con ciclos de **Trabajo (25 min)**, **Descanso corto (5 min)** y **Descanso largo (15 min cada 4 pomodoros)**. Incluye controles Iniciar/Pausar/Reiniciar, notificaciones sonoras y visuales al finalizar cada ciclo, contador persistente de pomodoros e interfaz responsive bilingüe (ES/EN).

## 2. Decisiones de stack

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Scripts clásicos (`<script>` en orden) | Módulos ES | Los módulos fallan por CORS al abrir `index.html` vía `file://`; con scripts clásicos la app funciona con doble clic, sin servidor local |
| Patrón módulo revelador + IIFE | Clases / frameworks | Encapsulación simple sin dependencias; un objeto global por archivo |
| Bus de eventos sobre `CustomEvent` en `document` | Callbacks anidados | Desacopla `timer` → `app` (p. ej. `timer:expired`) sin acoplamiento directo |
| `setInterval(250ms)` + cálculo por `Date.now()` | `setTimeout(1000)` decremental | Compensa el *drift* del temporizador y el *throttling* de pestañas en segundo plano |
| Web Audio API (osciladores) | `<audio>` con archivos mp3 | Cero assets externos; beeps sintetizados programáticamente |
| Favicon pintado con `<canvas>` | Archivos .ico estáticos | El favicon cambia de color según el modo, sin archivos extra |
| `localStorage` para contador/idioma/notificaciones | Solo memoria | Requisito acordado: el contador sobrevive recargas |

## 3. Estructura de archivos

```
Pomodoro-Modo-Plan-main/
├── index.html          → Vista: semántica HTML5, atributos data-i18n, aria-*
├── PLAN.md             → Este documento
├── README.md           → Descripción + historial de prompts
├── css/
│   └── styles.css      → Mobile-first, custom properties por modo, media queries
└── js/
    ├── state.js        → Estado central, pub/sub, persistencia, bus de eventos
    ├── i18n.js         → Diccionario ES/EN + aplicación de textos
    ├── audio.js        → Síntesis de beeps (Web Audio API)
    ├── notify.js       → Título de pestaña, favicon dinámico, Notification API
    ├── timer.js        → Máquina de cuenta regresiva (drift-compensated)
    └── app.js          → Controlador: wiring DOM ↔ estado ↔ eventos
```

### Responsabilidades

| Archivo | Responsabilidad única |
|---|---|
| `state.js` | Fuente de verdad: `mode`, `timeLeft`, `isRunning`, `completedPomodoros`. Publica snapshots a suscriptores. Define `PomodoroEvents` (bus). |
| `i18n.js` | Traducción: `t(key, params)`, aplicación a nodos `[data-i18n]` / `[data-i18n-aria]`, cambio y persistencia de idioma. |
| `audio.js` | Sonido: patrones de tonos ascendentes (fin de trabajo) y descendentes (fin de descanso); desbloqueo del `AudioContext` con el primer gesto. |
| `notify.js` | Notificación visual: `document.title` en marcha, favicon coloreado por modo, notificaciones del navegador solo si la pestaña está oculta. |
| `timer.js` | Tiempo: `start/pause/reset/toggle` con deadline absoluto (`endAt`) recalculado en cada tick. Emite `timer:expired`. |
| `app.js` | Render: suscripción al snapshot del estado, actualización de DOM, manejo de clics y del evento de expiración. |

## 4. Modelo de estado

```js
{
  mode: 'work' | 'short' | 'long',
  timeLeft: number,        // segundos restantes
  total: number,           // duración total del modo actual
  isRunning: boolean,
  completedPomodoros: number,
  longBreakEvery: 4
}
```

Flujo unidireccional:

```
        clic usuario                        render(snapshot)
┌───────────────────────┐   comandos    ┌─────────────────────────┐
│ index.html (Vista)    │ ────────────▶ │ app.js (Controlador)    │
│ botones, tabs, toggle │ ◀──────────── │ suscriptor del estado   │
└───────────────────────┘               └───────────┬─────────────┘
                                                    │
              ┌─────────────────┬───────────────────┼──────────────────┐
              ▼                 ▼                   ▼                  ▼
        ┌───────────┐    ┌───────────┐      ┌─────────────┐   ┌──────────────┐
        │ state.js  │    │ timer.js  │      │   i18n.js   │   │ audio/notify │
        │ pub/sub   │    │ deadlines │      │ diccionario │   │ efectos      │
        └─────┬─────┘    └─────┬─────┘      └─────────────┘   └──────────────┘
              │                │ emite 'timer:expired'
        localStorage           ▼
              │        app.handleExpired():
              ▼        +1 pomodoro → sonido → siguiente modo → estado
        persistencia
```

### Transición de modos (al expirar)

```
work ──▶ (completedPomodoros % 4 === 0) ? long : short
short ──▶ work
long ──▶ work
```

El avance automático deja el siguiente modo **en pausa** a duración completa: el usuario decide cuándo continuar.

## 5. Estrategia de temporización

- Se guarda un **deadline absoluto** (`deadline = Date.now() + timeLeft*1000`) al iniciar.
- Cada tick (250 ms) recalcula `restante = ceil((deadline - Date.now()) / 1000)`.
- Beneficios:
  - Sin acumulación de error por ticks retrasados (*drift compensation*).
  - Pausar = detener intervalo y conservar `timeLeft`; reanudar recalcula el deadline.
- Limitación conocida: en pestañas ocultas los navegadores limitan `setInterval` a ~1 Hz; la expiración puede dispararse hasta ~1 s tarde (el tiempo mostrado sigue siendo correcto). Mejora futura: mover el tick a un *Web Worker*.

## 6. Persistencia (localStorage)

| Clave | Contenido |
|---|---|
| `pomodoro.completed-count` | Contador de pomodoros completados |
| `pomodoro.language` | Idioma activo (`es` \| `en`) |
| `pomodoro.notifications-enabled` | Preferencia de notificaciones del navegador |

Todos los accesos están envueltos en `try/catch` para tolerar navegadores en modo privado o con almacenamiento bloqueado.

## 7. Notificaciones al finalizar ciclo

1. **Sonora**: secuencia de 3 tonos ascendentes (fin de trabajo) u 2 descendentes (fin de descanso), sintetizados con osciladores + envolvente de ganancia.
2. **Visual en interfaz**: el tema de color cambia por modo (rojo/trabajo, turquesa/descanso corto, azul/descanso largo) mediante CSS custom properties; el anillo SVG de progreso se reinicia.
3. **Título de pestaña**: `MM:SS · Modo` mientras corre; se restaura al pausar.
4. **Favicon dinámico**: círculo dibujado en `<canvas>` con el color del modo.
5. **Notification API** (opcional): el usuario la activa con el botón de campana; solo se muestra si la pestaña está oculta (`document.hidden`) y el permiso fue concedido.
6. **Región `aria-live`**: anuncia el cambio de fase para lectores de pantalla.

## 8. Internacionalización

- Diccionarios `es` / `en` en `i18n.js`; español por defecto.
- Textos estáticos marcados en HTML con `data-i18n="clave"` y `data-i18n-aria="clave"`.
- Textos dinámicos (etiqueta Iniciar/Pausar, modo actual, título) se resuelven en `render()` vía `t()`.
- Placeholders `{total}` / `{done}` sustituidos con `String.replaceAll`.
- El botón de idioma alterna ES↔EN, actualiza `<html lang>` y persiste la preferencia.

## 9. Checklist de accesibilidad

- [x] Semántica HTML5: `header`, `nav`, `main` implícito vía secciones, `section` con `aria-label`/`aria-labelledby`, `footer`.
- [x] Reloj con `role="timer"` y `aria-label` descriptivo (sin `aria-live` por segundo para no saturar lectores).
- [x] Región `role="status"` + `aria-live="assertive"` solo para cambios de fase.
- [x] Botones con etiquetas claras y `aria-pressed` donde aplica (modos, campana).
- [x] Áreas táctiles ≥ 44 px (botones `min-height: 48px`).
- [x] `:focus-visible` con color de acento del modo activo.
- [x] Contraste AA: texto principal #f1f5f9 y secundario #94a3b8 sobre fondo #0b1020.
- [x] `prefers-reduced-motion`: transiciones anuladas.
- [x] SVG decorativos con `aria-hidden="true"` y `focusable="false"`.
- [x] Dots de ciclo como `role="img"` con `aria-label` calculada ("N de 4 ciclos").

## 10. UI/UX

- **Mobile-first**: diseño base para ~320 px, mejoras progresivas con `clamp()` y media query ≥ 560 px.
- Anillo de progreso SVG (`stroke-dashoffset` proporcional al tiempo transcurrido).
- Temas por modo vía `body[data-mode]` → variables `--accent` / `--accent-deep`.
- Tipografía numérica tabular (`font-variant-numeric`) para que el reloj no "baile".
- Pestañas de modo tipo segment control; botón primario (Iniciar/Pausar) y secundario (Reiniciar).

## 11. Fases de implementación

| Fase | Estado |
|---|---|
| Estructura base (HTML semántico + layout responsive) | ✅ |
| Estado central + persistencia | ✅ |
| Temporizador con compensación de drift | ✅ |
| Audio con Web Audio API | ✅ |
| Notificaciones visuales (tema, título, favicon, Notification API) | ✅ |
| Contador de pomodoros + indicador de superciclo | ✅ |
| i18n ES/EN | ✅ |
| Accesibilidad (roles, live regions, contraste, reduced motion) | ✅ |

## 12. Mejoras futuras (backlog)

- Web Worker para precisión de expiración en segundo plano.
- Auto-inicio opcional del siguiente ciclo (ajuste configurable).
- Duraciones configurables por el usuario (persistidas).
- Atajos de teclado (espacio = iniciar/pausar, R = reiniciar).
- PWA: manifest + service worker para instalación offline.
- Estadísticas de sesión históricas.

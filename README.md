# Pomodoro-Modo-Plan

Temporizador web basado en la **técnica Pomodoro**, desarrollado exclusivamente con la pila web estándar: **HTML5, CSS3 y JavaScript Vanilla**. Sin frameworks (React, Angular, Vue) ni librerías externas de interfaz o lógica.

> 📐 El plan de arquitectura completo está documentado en [PLAN.md](PLAN.md).

## Características

- ⏱️ **4 métodos de temporización** seleccionables:

  | Método | Trabajo | Corto | Largo | Largo cada |
  |---|---|---|---|---|
  | 🍅 Clásico | 25 min | 5 min | 15 min | 4 ciclos |
  | ⚡ Prolongado | 50 min | 10 min | 30 min | 2 ciclos |
  | ⏳ Regla 52/17 | 52 min | 17 min | 25 min | 2 ciclos |
  | 🧠 Ultradiano | 90 min | 20 min | 20 min | 2 ciclos |

- ▶️ Controles de **Iniciar / Pausar / Reiniciar**.
- 🔔 Notificaciones al finalizar cada ciclo:
  - Sonora con la **Web Audio API** (beeps sintetizados, sin archivos externos).
  - Visual: cambio de tema por modo, título de pestaña en vivo (`⏰ 12:34 · 🔥 Trabajo`), favicon dinámico con emojis y notificaciones del navegador opcionales.
- 📊 Contador de pomodoros **independiente por método** y persistente (`localStorage`), con migración automática del contador antiguo e indicador de progreso hacia el descanso largo.
- 😀 Emojis integrados en toda la interfaz (se filtran de los `aria-label` para una lectura limpia por lectores de pantalla).
- 🌐 Interfaz bilingüe **Español / English** conmutable en caliente.
- 📱 Diseño responsive *mobile-first*, accesible (semántica HTML5, ARIA, `prefers-reduced-motion`, contraste AA).

## Cómo ejecutarlo

Opción 1 — sin servidor: abre `index.html` directamente en el navegador (doble clic).

Opción 2 — con servidor local:

```bash
python -m http.server 8080
# luego visita http://localhost:8080
```

## Estructura del proyecto

```
├── index.html        # Vista (semántica HTML5 + atributos data-i18n/aria)
├── PLAN.md           # Plan de arquitectura
├── README.md         # Este archivo
├── css/
│   └── styles.css    # Estilos responsive mobile-first
└── js/
    ├── state.js      # Estado central + localStorage + bus de eventos
    ├── i18n.js       # Diccionario ES/EN
    ├── audio.js      # Beeps con Web Audio API
    ├── notify.js     # Título de pestaña, favicon dinámico, Notification API
    ├── timer.js      # Cuenta regresiva con compensación de drift
    └── app.js        # Controlador / render
```

## Historial de Prompts

Registro de los prompts utilizados durante el desarrollo. Los próximos prompts se irán añadiendo aquí.

### Prompt 1 — Requerimientos iniciales (2026-08-25)

> Quiero crear una aplicación Web "Pomodoro" debe ser desarrollada utilizando únicamente la pila web estándar (HTML5, CSS3 y JavaScript Vanilla), sin el uso de frameworks (como React, Angular o Vue) ni librerías externas de interfaz o lógica.
>
> Requerimientos Funcionales Mínimos:
>
> - Temporizador Funcional: Ciclos predefinidos de 25 minutos de trabajo (Work) y 5 minutos de descanso (Short Break).
> - Controles del Temporizador: Botones de control para Iniciar, Pausar y Reiniciar la cuenta regresiva.
> - Notificaciones: Alerta sonora (usando Audio API web) y/o visual (cambios de estado en la pestaña/interfaz) al finalizar cada ciclo.
> - Contador de Ciclos: Contador persistente en memoria que indique la cantidad de Pomodoros completados en la sesión.
> - Interfaz de Usuario (UI/UX): Diseño responsive, limpio, accesible (semántica HTML5) y adaptativo a dispositivos móviles y de escritorio.
>
> Además agrega este y los próximos prompts que te diga en el readme y crea un archivo llamado PLAN.md donde almacenes el plan de arquitectura.

**Aclaraciones acordadas:** interfaz bilingüe (ES por defecto), contador persistente con `localStorage` (sobrevive recargas) y descanso largo incluido cada 4 pomodoros.

### Prompt 2 — Métodos adicionales y emojis (2026-08-25)

> Ahora igualmente quiero que le agregues los otros métdodos de pomodoro y que tenga emojis

**Aclaraciones acordadas:** cuatro métodos seleccionables (Clásico · Prolongado · Regla 52/17 · Ultradiano), emojis en toda la interfaz (limpios para lectores de pantalla) y contador de pomodoros independiente por método.

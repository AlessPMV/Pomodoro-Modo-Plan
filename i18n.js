'use strict';

const PomodoroI18n = (() => {
  const STORAGE_KEY_LANG = 'pomodoro.language';
  const DEFAULT_LANG = 'es';

  const dictionaries = {
    es: {
      titleDefault: 'Pomodoro',
      modeWork: 'Trabajo',
      modeShort: 'Descanso corto',
      modeLong: 'Descanso largo',
      start: 'Iniciar',
      pause: 'Pausar',
      reset: 'Reiniciar',
      completedLabel: 'pomodoros completados',
      dotsAria: '{done} de {total} ciclos completados para el descanso largo',
      longBreakHint: 'Descanso largo cada {total} pomodoros',
      tabsAria: 'Seleccionar modo del temporizador',
      langButton: 'English',
      langAria: 'Cambiar idioma a English',
      notifEnable: 'Activar notificaciones del navegador',
      notifDisable: 'Desactivar notificaciones del navegador',
      notifUnsupported: 'Notificaciones no soportadas en este navegador',
      notifDeniedTitle: 'Permiso de notificaciones denegado',
      statusWorkDone: 'Ciclo de trabajo completado. Inicia el descanso cuando estés listo.',
      statusShortDone: 'Descanso corto terminado. Es hora de volver al trabajo.',
      statusLongDone: 'Descanso largo terminado. Gran sesión, comienza un nuevo ciclo.',
      notifRestReady: '¡Ciclo completado! Hora de descansar.',
      notifLongReady: '¡Cuatro pomodoros! Disfruta tu descanso largo.',
      notifWorkReady: 'Fin del descanso. ¡De vuelta al trabajo!',
      madeWith: 'Hecho con HTML5, CSS3 y JavaScript Vanilla',
    },
    en: {
      titleDefault: 'Pomodoro',
      modeWork: 'Work',
      modeShort: 'Short Break',
      modeLong: 'Long Break',
      start: 'Start',
      pause: 'Pause',
      reset: 'Reset',
      completedLabel: 'pomodoros completed',
      dotsAria: '{done} of {total} cycles completed toward the long break',
      longBreakHint: 'Long break every {total} pomodoros',
      tabsAria: 'Select timer mode',
      langButton: 'Español',
      langAria: 'Switch language to Español',
      notifEnable: 'Enable browser notifications',
      notifDisable: 'Disable browser notifications',
      notifUnsupported: 'Notifications not supported in this browser',
      notifDeniedTitle: 'Notification permission denied',
      statusWorkDone: 'Work cycle completed. Start your break whenever you are ready.',
      statusShortDone: 'Short break over. Time to get back to work.',
      statusLongDone: 'Long break over. Great session, start a new cycle.',
      notifRestReady: 'Cycle completed! Time to take a break.',
      notifLongReady: 'Four pomodoros done! Enjoy your long break.',
      notifWorkReady: 'Break is over. Back to work!',
      madeWith: 'Built with HTML5, CSS3 and Vanilla JavaScript',
    },
  };

  let current = loadStoredLang();

  function loadStoredLang() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_LANG);
      if (stored && stored in dictionaries) {
        return stored;
      }
    } catch {}
    return DEFAULT_LANG;
  }

  function t(key, params) {
    const template =
      (dictionaries[current] && dictionaries[current][key]) ??
      (dictionaries[DEFAULT_LANG] && dictionaries[DEFAULT_LANG][key]) ??
      key;
    if (!params) {
      return template;
    }
    return Object.entries(params).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  }

  function applyStaticTexts(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }

  function getLang() {
    return current;
  }

  function setLang(lang) {
    if (!(lang in dictionaries)) {
      return;
    }
    current = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {}
    document.documentElement.lang = lang;
    applyStaticTexts(document);
    PomodoroEvents.emit('i18n:change', { lang });
  }

  document.documentElement.lang = current;

  return { t, getLang, setLang, applyStaticTexts };
})();

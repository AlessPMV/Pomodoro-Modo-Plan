'use strict';

const PomodoroNotify = (() => {
  const STORAGE_KEY_PREF = 'pomodoro.notifications-enabled';
  const FAVICON_SIZE = 64;

  let enabled = loadPreference();
  let faviconLink = null;

  function loadPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY_PREF) === 'true';
    } catch {
      return false;
    }
  }

  function persistPreference() {
    try {
      window.localStorage.setItem(STORAGE_KEY_PREF, String(enabled));
    } catch {}
  }

  function isSupported() {
    return 'Notification' in window;
  }

  function isEnabled() {
    return isSupported() && enabled && Notification.permission === 'granted';
  }

  async function enableNotifications() {
    if (!isSupported()) {
      return false;
    }
    if (Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      } catch {
        return false;
      }
    }
    enabled = true;
    persistPreference();
    return true;
  }

  function disableNotifications() {
    enabled = false;
    persistPreference();
  }

  function showIfHidden(title, body) {
    if (!isEnabled() || !document.hidden) {
      return;
    }
    try {
      new Notification(title, { body, tag: 'pomodoro-cycle' });
    } catch {}
  }

  function setTitle(text) {
    document.title = text;
  }

  function resetTitle(defaultTitle) {
    document.title = defaultTitle;
  }

  function ensureFaviconLink() {
    if (!faviconLink) {
      faviconLink = document.querySelector('link[rel="icon"]');
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
    }
    return faviconLink;
  }

  function paintFavicon(color) {
    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
    context.fillStyle = color;
    context.beginPath();
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, FAVICON_SIZE / 2 - 6, 0, Math.PI * 2);
    context.fill();
    ensureFaviconLink().href = canvas.toDataURL('image/png');
  }

  return {
    isSupported,
    isEnabled,
    enableNotifications,
    disableNotifications,
    showIfHidden,
    setTitle,
    resetTitle,
    paintFavicon,
  };
})();

'use strict';

const PomodoroEvents = {
  emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  },
  on(name, handler) {
    document.addEventListener(name, handler);
  },
};

const PomodoroState = (() => {
  const STORAGE_KEY_METHOD = 'pomodoro.method';
  const STORAGE_KEY_COUNTS = 'pomodoro.completed-by-method';
  const LEGACY_STORAGE_KEY_COUNT = 'pomodoro.completed-count';
  const DEFAULT_METHOD_KEY = 'classic';

  const METHODS = {
    classic: {
      durations: { work: 25 * 60, short: 5 * 60, long: 15 * 60 },
      longBreakEvery: 4,
    },
    deep50: {
      durations: { work: 50 * 60, short: 10 * 60, long: 30 * 60 },
      longBreakEvery: 2,
    },
    rule5217: {
      durations: { work: 52 * 60, short: 17 * 60, long: 25 * 60 },
      longBreakEvery: 2,
    },
    ultradian: {
      durations: { work: 90 * 60, short: 20 * 60, long: 20 * 60 },
      longBreakEvery: 2,
    },
  };

  let methodKey = loadStoredMethod();
  let mode = 'work';
  let timeLeft = METHODS[methodKey].durations.work;
  let isRunning = false;
  let completedByMethod = loadStoredCounts();

  const subscribers = new Set();

  function loadStoredMethod() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_METHOD);
      if (stored && stored in METHODS) {
        return stored;
      }
    } catch {}
    return DEFAULT_METHOD_KEY;
  }

  function buildEmptyCounts() {
    return Object.fromEntries(Object.keys(METHODS).map((key) => [key, 0]));
  }

  function loadStoredCounts() {
    const counts = buildEmptyCounts();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_COUNTS);
      if (raw) {
        const parsed = JSON.parse(raw) || {};
        Object.keys(counts).forEach((key) => {
          const value = Number(parsed[key]);
          if (Number.isInteger(value) && value >= 0) {
            counts[key] = value;
          }
        });
      } else {
        const legacy = Number(window.localStorage.getItem(LEGACY_STORAGE_KEY_COUNT));
        if (Number.isInteger(legacy) && legacy >= 0) {
          counts[DEFAULT_METHOD_KEY] = legacy;
        }
      }
    } catch {}
    return counts;
  }

  function persistMethod() {
    try {
      window.localStorage.setItem(STORAGE_KEY_METHOD, methodKey);
    } catch {}
  }

  function persistCounts() {
    try {
      window.localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(completedByMethod));
    } catch {}
  }

  function getSnapshot() {
    const method = METHODS[methodKey];
    return {
      methodKey,
      method,
      mode,
      timeLeft,
      total: method.durations[mode],
      isRunning,
      completedPomodoros: completedByMethod[methodKey],
      longBreakEvery: method.longBreakEvery,
    };
  }

  function publish() {
    const snapshot = getSnapshot();
    subscribers.forEach((listener) => listener(snapshot));
  }

  function subscribe(listener) {
    subscribers.add(listener);
    listener(getSnapshot());
    return () => subscribers.delete(listener);
  }

  function getTimeLeft() {
    return timeLeft;
  }

  function getMode() {
    return mode;
  }

  function setTimeLeft(seconds) {
    timeLeft = Math.max(0, Math.round(seconds));
    publish();
  }

  function setRunning(running) {
    isRunning = Boolean(running);
    publish();
  }

  function setMode(nextMode) {
    const durations = METHODS[methodKey].durations;
    if (!(nextMode in durations)) {
      return;
    }
    mode = nextMode;
    timeLeft = durations[nextMode];
    publish();
  }

  function resetCurrentMode() {
    timeLeft = METHODS[methodKey].durations[mode];
    publish();
  }

  function setMethod(nextMethodKey) {
    if (!(nextMethodKey in METHODS) || nextMethodKey === methodKey) {
      return;
    }
    methodKey = nextMethodKey;
    persistMethod();
    mode = 'work';
    timeLeft = METHODS[methodKey].durations.work;
    publish();
  }

  function registerCompletedPomodoro() {
    completedByMethod[methodKey] += 1;
    persistCounts();
    publish();
  }

  return {
    METHODS,
    DEFAULT_METHOD_KEY,
    subscribe,
    getSnapshot,
    getTimeLeft,
    getMode,
    setTimeLeft,
    setRunning,
    setMode,
    setMethod,
    resetCurrentMode,
    registerCompletedPomodoro,
  };
})();

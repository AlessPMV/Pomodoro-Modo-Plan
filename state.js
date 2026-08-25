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
  const STORAGE_KEY_COUNT = 'pomodoro.completed-count';

  const MODE_DURATIONS = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  const LONG_BREAK_EVERY = 4;

  let mode = 'work';
  let timeLeft = MODE_DURATIONS.work;
  let isRunning = false;
  let completedPomodoros = readStoredCount();

  const subscribers = new Set();

  function readStoredCount() {
    try {
      const value = Number(window.localStorage.getItem(STORAGE_KEY_COUNT));
      return Number.isInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function persistCount() {
    try {
      window.localStorage.setItem(STORAGE_KEY_COUNT, String(completedPomodoros));
    } catch {}
  }

  function getSnapshot() {
    return {
      mode,
      timeLeft,
      total: MODE_DURATIONS[mode],
      isRunning,
      completedPomodoros,
      longBreakEvery: LONG_BREAK_EVERY,
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
    if (!(nextMode in MODE_DURATIONS)) {
      return;
    }
    mode = nextMode;
    timeLeft = MODE_DURATIONS[nextMode];
    publish();
  }

  function resetCurrentMode() {
    timeLeft = MODE_DURATIONS[mode];
    publish();
  }

  function registerCompletedPomodoro() {
    completedPomodoros += 1;
    persistCount();
    publish();
  }

  return {
    MODE_DURATIONS,
    LONG_BREAK_EVERY,
    subscribe,
    getSnapshot,
    getTimeLeft,
    getMode,
    setTimeLeft,
    setRunning,
    setMode,
    resetCurrentMode,
    registerCompletedPomodoro,
  };
})();

'use strict';

const PomodoroTimer = (() => {
  const TICK_INTERVAL_MS = 250;

  let intervalId = null;
  let deadline = 0;

  function isRunning() {
    return intervalId !== null;
  }

  function stopInterval() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    const remainingSeconds = Math.ceil((deadline - Date.now()) / 1000);

    if (remainingSeconds <= 0) {
      stopInterval();
      PomodoroState.setTimeLeft(0);
      PomodoroState.setRunning(false);
      PomodoroEvents.emit('timer:expired', { mode: PomodoroState.getMode() });
      return;
    }

    if (remainingSeconds !== PomodoroState.getTimeLeft()) {
      PomodoroState.setTimeLeft(remainingSeconds);
    }
  }

  function start() {
    if (isRunning()) {
      return;
    }
    if (PomodoroState.getTimeLeft() <= 0) {
      PomodoroState.resetCurrentMode();
    }
    PomodoroAudio.prime();
    deadline = Date.now() + PomodoroState.getTimeLeft() * 1000;
    intervalId = window.setInterval(tick, TICK_INTERVAL_MS);
    PomodoroState.setRunning(true);
    tick();
  }

  function pause() {
    if (!isRunning()) {
      return;
    }
    stopInterval();
    PomodoroState.setRunning(false);
  }

  function reset() {
    stopInterval();
    PomodoroState.setRunning(false);
    PomodoroState.resetCurrentMode();
  }

  function toggle() {
    if (isRunning()) {
      pause();
    } else {
      start();
    }
  }

  return { start, pause, reset, toggle, isRunning };
})();

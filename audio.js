'use strict';

const PomodoroAudio = (() => {
  const VOLUME = 0.25;

  const WORK_COMPLETE_PATTERN = [
    { frequency: 659.26, at: 0, duration: 0.16 },
    { frequency: 987.77, at: 0.2, duration: 0.16 },
    { frequency: 1318.51, at: 0.4, duration: 0.3 },
  ];

  const BREAK_COMPLETE_PATTERN = [
    { frequency: 880, at: 0, duration: 0.16 },
    { frequency: 587.33, at: 0.2, duration: 0.3 },
  ];

  let audioContext = null;

  function getContext() {
    if (!audioContext) {
      const ContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!ContextCtor) {
        return null;
      }
      try {
        audioContext = new ContextCtor();
      } catch {
        return null;
      }
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function scheduleTone(context, frequency, startTime, duration) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(VOLUME, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  }

  function playPattern(pattern) {
    const context = getContext();
    if (!context) {
      return;
    }
    const baseTime = context.currentTime + 0.05;
    pattern.forEach(({ frequency, at, duration }) => {
      scheduleTone(context, frequency, baseTime + at, duration);
    });
  }

  function prime() {
    getContext();
  }

  function playWorkComplete() {
    playPattern(WORK_COMPLETE_PATTERN);
  }

  function playBreakComplete() {
    playPattern(BREAK_COMPLETE_PATTERN);
  }

  return { prime, playWorkComplete, playBreakComplete };
})();

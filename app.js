'use strict';

(() => {
  const RING_RADIUS = 108;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const dom = {};
  let snapshot = null;
  let previousMode = null;
  let lastStatusKey = null;

  function cacheDom() {
    dom.app = document.getElementById('app');
    dom.modeTabs = Array.from(document.querySelectorAll('.mode-tab'));
    dom.ringProgress = document.getElementById('ring-progress');
    dom.timeDisplay = document.getElementById('time-display');
    dom.modeLabel = document.getElementById('mode-label');
    dom.startPauseBtn = document.getElementById('btn-start-pause');
    dom.startPauseLabel = dom.startPauseBtn.querySelector('.btn-label');
    dom.resetBtn = document.getElementById('btn-reset');
    dom.pomodoroCount = document.getElementById('pomodoro-count');
    dom.cycleDotsWrapper = document.getElementById('cycle-dots');
    dom.cycleDots = Array.from(document.querySelectorAll('#cycle-dots .dot'));
    dom.longBreakHint = document.getElementById('long-break-hint');
    dom.statusRegion = document.getElementById('status-region');
    dom.langBtn = document.getElementById('btn-lang');
    dom.notifBtn = document.getElementById('btn-notifications');
  }

  function formatClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function modeLabelKey(mode) {
    return `mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
  }

  function getAccentColor(mode) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--accent-${mode}`).trim();
  }

  function render(nextSnapshot) {
    snapshot = nextSnapshot;

    if (snapshot.mode !== previousMode) {
      previousMode = snapshot.mode;
      const accent = getAccentColor(snapshot.mode);
      if (accent) {
        PomodoroNotify.paintFavicon(accent);
      }
    }

    dom.app.dataset.mode = snapshot.mode;
    document.body.dataset.mode = snapshot.mode;

    const elapsedFraction = snapshot.total > 0 ? (snapshot.total - snapshot.timeLeft) / snapshot.total : 0;
    dom.ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    dom.ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - elapsedFraction));

    dom.timeDisplay.textContent = formatClock(snapshot.timeLeft);
    dom.timeDisplay.setAttribute('aria-label', `${formatClock(snapshot.timeLeft)} — ${PomodoroI18n.t(modeLabelKey(snapshot.mode))}`);

    dom.modeLabel.textContent = PomodoroI18n.t(modeLabelKey(snapshot.mode));
    dom.startPauseLabel.textContent = PomodoroI18n.t(snapshot.isRunning ? 'pause' : 'start');

    renderTabs(snapshot.mode);
    renderSessionPanel(snapshot);
    updateDocumentTitle(snapshot);
    updateNotificationButton();
  }

  function renderTabs(activeMode) {
    dom.modeTabs.forEach((tab) => {
      const isActive = tab.dataset.mode === activeMode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    });
  }

  function renderSessionPanel(state) {
    const perSuperCycle = state.longBreakEvery;
    let filledDots = state.completedPomodoros % perSuperCycle;
    if (state.mode === 'long') {
      filledDots = perSuperCycle;
    }

    dom.pomodoroCount.textContent = String(state.completedPomodoros);

    dom.cycleDots.forEach((dot, index) => {
      dot.classList.toggle('is-filled', index < filledDots);
    });

    dom.cycleDotsWrapper.setAttribute(
      'aria-label',
      PomodoroI18n.t('dotsAria', { done: filledDots, total: perSuperCycle })
    );
    dom.longBreakHint.textContent = PomodoroI18n.t('longBreakHint', { total: perSuperCycle });
  }

  function updateDocumentTitle(state) {
    if (state.isRunning) {
      PomodoroNotify.setTitle(`${formatClock(state.timeLeft)} · ${PomodoroI18n.t(modeLabelKey(state.mode))}`);
    } else {
      PomodoroNotify.resetTitle(PomodoroI18n.t('titleDefault'));
    }
  }

  function updateNotificationButton() {
    if (!PomodoroNotify.isSupported()) {
      dom.notifBtn.disabled = true;
      dom.notifBtn.setAttribute('aria-label', PomodoroI18n.t('notifUnsupported'));
      dom.notifBtn.title = PomodoroI18n.t('notifUnsupported');
      return;
    }
    const active = PomodoroNotify.isEnabled();
    dom.notifBtn.disabled = false;
    dom.notifBtn.classList.toggle('is-active', active);
    dom.notifBtn.setAttribute('aria-pressed', String(active));
    const label = PomodoroI18n.t(active ? 'notifDisable' : 'notifEnable');
    dom.notifBtn.setAttribute('aria-label', label);
    dom.notifBtn.title = label;
  }

  function setStatus(statusKey) {
    lastStatusKey = statusKey;
    dom.statusRegion.textContent = PomodoroI18n.t(statusKey);
  }

  async function handleNotificationToggle() {
    if (PomodoroNotify.isEnabled()) {
      PomodoroNotify.disableNotifications();
    } else {
      const granted = await PomodoroNotify.enableNotifications();
      if (!granted) {
        setStatus('notifDeniedTitle');
      }
    }
    updateNotificationButton();
  }

  function handleExpired(event) {
    const finishedMode = event.detail.mode;

    if (finishedMode === 'work') {
      PomodoroState.registerCompletedPomodoro();
      PomodoroAudio.playWorkComplete();

      const shouldTakeLongBreak = snapshot.completedPomodoros % PomodoroState.LONG_BREAK_EVERY === 0;
      const nextMode = shouldTakeLongBreak ? 'long' : 'short';

      PomodoroState.setMode(nextMode);
      setStatus('statusWorkDone');
      PomodoroNotify.showIfHidden(
        PomodoroI18n.t('titleDefault'),
        PomodoroI18n.t(shouldTakeLongBreak ? 'notifLongReady' : 'notifRestReady')
      );
      return;
    }

    PomodoroAudio.playBreakComplete();
    PomodoroState.setMode('work');
    setStatus(finishedMode === 'long' ? 'statusLongDone' : 'statusShortDone');
    PomodoroNotify.showIfHidden(PomodoroI18n.t('titleDefault'), PomodoroI18n.t('notifWorkReady'));
  }

  function handleLanguageChange() {
    PomodoroI18n.applyStaticTexts(document);
    if (snapshot) {
      render(snapshot);
    }
    if (lastStatusKey) {
      setStatus(lastStatusKey);
    }
  }

  function bindEvents() {
    dom.modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        if (!snapshot || snapshot.mode === tab.dataset.mode) {
          return;
        }
        PomodoroTimer.reset();
        PomodoroState.setMode(tab.dataset.mode);
      });
    });

    dom.startPauseBtn.addEventListener('click', () => PomodoroTimer.toggle());
    dom.resetBtn.addEventListener('click', () => PomodoroTimer.reset());

    dom.langBtn.addEventListener('click', () => {
      PomodoroI18n.setLang(PomodoroI18n.getLang() === 'es' ? 'en' : 'es');
    });

    dom.notifBtn.addEventListener('click', handleNotificationToggle);

    PomodoroState.subscribe(render);
    PomodoroEvents.on('timer:expired', handleExpired);
    PomodoroEvents.on('i18n:change', handleLanguageChange);
  }

  function init() {
    cacheDom();
    bindEvents();
    PomodoroI18n.applyStaticTexts(document);
    render(PomodoroState.getSnapshot());
  }

  init();
})();

import './style.css';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const root = document.querySelector('#app');
const savedMinutes = Number(localStorage.getItem('restReminderMinutes')) || 20;
const state = {
  durationMs: Math.max(1, savedMinutes) * 60_000,
  remainingMs: Math.max(1, savedMinutes) * 60_000,
  deadline: null,
  interval: null,
  running: false,
  paused: false,
  notificationId: 7321,
};

root.innerHTML = `
  <main class="shell">
    <header class="header"><div class="brand-icon" aria-hidden="true">☕</div><div><p class="eyebrow">MINDFUL BREAKS</p><h1>休息提醒</h1></div></header>
    <section class="panel timer-panel">
      <p class="section-label">距离下一次休息</p>
      <div id="clock" class="clock" aria-live="polite">20:00</div>
      <div class="progress-track"><div id="progress" class="progress-fill"></div></div>
      <p id="status" class="status" aria-live="polite">准备好后，开始计时吧</p>
      <div class="actions">
        <button id="start" class="button primary">开始</button>
        <button id="pause" class="button secondary" disabled>暂停</button>
        <button id="resume" class="button secondary" disabled>继续</button>
        <button id="reset" class="button quiet">重置</button>
      </div>
    </section>
    <section class="panel settings-panel">
      <div class="setting-heading"><div><h2>计时设置</h2><p>设置工作间隔（1–180 分钟）</p></div><span class="setting-icon">⚙️</span></div>
      <label for="minutes">计时时长（分钟）</label>
      <div class="input-row"><input id="minutes" type="number" min="1" max="180" step="1" value="${savedMinutes}" /><button id="apply" class="button secondary">应用</button></div>
      <label class="sound-toggle"><input id="sound" type="checkbox" checked /><span>计时结束时播放声音</span></label>
      <button id="test-sound" class="text-button">试听提示音</button>
      <p class="footnote">通知需要系统授权。手机静音、专注模式或系统省电设置可能影响声音与通知。</p>
    </section>
    <footer>给眼睛和身体一点喘息的时间 🌿</footer>
  </main>`;

const $ = (id) => document.getElementById(id);
const clock = $('clock');
const status = $('status');
const progress = $('progress');
const minutesInput = $('minutes');
const startButton = $('start');
const pauseButton = $('pause');
const resumeButton = $('resume');
const resetButton = $('reset');
const applyButton = $('apply');

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function render() {
  clock.textContent = formatTime(state.remainingMs);
  const ratio = state.durationMs ? state.remainingMs / state.durationMs : 0;
  progress.style.width = `${Math.max(0, Math.min(100, (1 - ratio) * 100))}%`;
  startButton.disabled = state.running || state.paused;
  pauseButton.disabled = !state.running;
  resumeButton.disabled = !state.paused;
  minutesInput.disabled = state.running || state.paused;
  applyButton.disabled = state.running || state.paused;
}

function beep() {
  if (!$('sound').checked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    [0, 0.24, 0.48].forEach((offset) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.18);
    });
    window.setTimeout(() => context.close().catch(() => {}), 1200);
  } catch (error) {
    console.warn('无法播放提示音', error);
  }
}

async function cancelReminder() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: state.notificationId }] });
  } catch (error) {
    console.warn('取消通知失败', error);
  }
}

async function scheduleReminder() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      status.textContent = '计时已开始；通知权限未开启，应用在前台时仍会提醒';
      return;
    }
    await LocalNotifications.schedule({ notifications: [{
      id: state.notificationId,
      title: '休息时间到啦 ☕',
      body: '站起来活动一下，看看远处，放松一下眼睛。',
      schedule: { at: new Date(state.deadline) },
      sound: 'default',
      smallIcon: 'ic_stat_icon_config_sample',
    }] });
  } catch (error) {
    console.warn('安排本地通知失败', error);
    status.textContent = '计时已开始，但系统通知暂时无法安排';
  }
}

function stopTicker() {
  if (state.interval !== null) window.clearInterval(state.interval);
  state.interval = null;
}

function finishTimer() {
  stopTicker();
  state.running = false;
  state.paused = false;
  state.remainingMs = 0;
  state.deadline = null;
  status.textContent = '休息时间到啦！离开屏幕，活动一下 🌿';
  render();
  beep();
  if (Capacitor.isNativePlatform()) {
    // The native local notification is scheduled when starting; this foreground alert
    // complements it when the app is open.
  } else {
    window.alert('休息时间到啦！站起来活动一下，放松眼睛吧。');
  }
}

function tick() {
  if (!state.running || state.deadline === null) return;
  state.remainingMs = Math.max(0, state.deadline - Date.now());
  if (state.remainingMs <= 0) finishTimer();
  else render();
}

async function startTimer() {
  if (state.running || state.paused) return;
  state.running = true;
  state.deadline = Date.now() + state.remainingMs;
  status.textContent = '正在计时，记得适时休息';
  render();
  await cancelReminder();
  await scheduleReminder();
  stopTicker();
  state.interval = window.setInterval(tick, 250);
}

async function pauseTimer() {
  if (!state.running) return;
  state.remainingMs = Math.max(0, state.deadline - Date.now());
  state.running = false;
  state.paused = true;
  state.deadline = null;
  stopTicker();
  await cancelReminder();
  status.textContent = '计时已暂停';
  render();
}

async function resumeTimer() {
  if (!state.paused) return;
  state.paused = false;
  await startTimer();
}

async function resetTimer() {
  stopTicker();
  await cancelReminder();
  state.running = false;
  state.paused = false;
  state.deadline = null;
  state.remainingMs = state.durationMs;
  status.textContent = '计时已重置';
  render();
}

startButton.addEventListener('click', startTimer);
pauseButton.addEventListener('click', pauseTimer);
resumeButton.addEventListener('click', resumeTimer);
resetButton.addEventListener('click', resetTimer);
$('test-sound').addEventListener('click', beep);
applyButton.addEventListener('click', () => {
  const minutes = Number(minutesInput.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    status.textContent = '请输入 1 到 180 之间的整数分钟';
    minutesInput.focus();
    return;
  }
  state.durationMs = minutes * 60_000;
  state.remainingMs = state.durationMs;
  localStorage.setItem('restReminderMinutes', String(minutes));
  status.textContent = `已设置为 ${minutes} 分钟`;
  render();
});

// Keep the display accurate after the app returns from the background.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

render();

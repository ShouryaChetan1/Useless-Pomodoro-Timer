// ====== Eternal Pomodoro (useless on purpose) ======
const DISPLAY = document.getElementById('timer-display');
const START = document.getElementById('startBtn');
const PAUSE = document.getElementById('pauseBtn');
const RESET = document.getElementById('resetBtn');
const QUOTE = document.getElementById('quoteText');
const LOG = document.getElementById('logList');
const UNSTOP = document.getElementById('unstoppableToggle');
const ASMR = document.getElementById('asmrToggle');

// Baselines
const BASE_SECONDS = 25 * 60;           // 25:00
const RESET_AT_SECONDS = 16 * 60 + 30;  // 16:30

const ridiculousQuotes = [
  "Rome wasn’t built in a day… but it was destroyed in one, so take it easy.",
  "Be the cloud, not the rain… or maybe the rain? Idk, you got this!",
  "If at first you don’t succeed, redefine success.",
  "Procrastination is just pre-consideration taken seriously.",
  "Walk slowly, for time is chasing you anyway.",
  "Dream big. Nap bigger.",
  "Your future self already forgave you.",
  "Deadlines are suggestions with attitude."
];

let state = {
  running: false,
  timeLeft: BASE_SECONDS,
  lastTick: null,
  allowFinishThisRun: false, // 5% chance per Start press
  timeDilationOn: false,
  timerId: null,
  glitchTimerId: null,
  whisperTimerId: null,
  companion: null,           // window handler for Unstoppable Mode
};

// --- Utilities ---
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function setDisplay() { DISPLAY.textContent = fmt(state.timeLeft); }
function log(msg) {
  const li = document.createElement('li');
  li.textContent = msg;
  LOG.prepend(li);
}
function randomItem(a){ return a[Math.floor(Math.random()*a.length)]; }

// --- Quotes cycle ---
function cycleQuote() { QUOTE.textContent = randomItem(ridiculousQuotes); }
setInterval(cycleQuote, 8000);
cycleQuote();

// --- ASMR Whispers (Web Speech API) ---
function whisper(text){
  if (!ASMR.checked) return;
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; u.pitch = 0.7;
  const voices = speechSynthesis.getVoices();
  const soft = voices.find(v => /en-|en_US|en-GB|female|Samantha|Serena/i.test(v.name));
  if (soft) u.voice = soft;
  window.speechSynthesis.speak(u);
}

function scheduleWhispers(){
  clearTimeout(state.whisperTimerId);
  const delay = 12000 + Math.random()*15000; // 12–27s
  state.whisperTimerId = setTimeout(() => {
    const lines = [
      "Time is just a social construct… keep going…",
      "Inhale focus… exhale responsibility…",
      "Let the seconds melt… gently… slooowly…",
      "Shh… productivity is sleeping…"
    ];
    whisper(randomItem(lines));
    scheduleWhispers();
  }, delay);
}

// --- The cursed countdown tick ---
function tick() {
  if (!state.running) return;
  const now = performance.now();
  if (state.lastTick == null) state.lastTick = now;
  const realDelta = (now - state.lastTick) / 1000; // seconds since last tick
  state.lastTick = now;

  // Time dilation if finishing is allowed and we're in the last minute
  let factor = 1;
  if (state.allowFinishThisRun) {
    if (state.timeLeft <= 60) {
      // non-linear slowdown 60s→0s mapped ~0.2→0.01
      const x = Math.max(0, state.timeLeft) / 60;
      factor = Math.max(0.01, 0.05 + 0.15 * (x*x));
      state.timeDilationOn = true;
    } else {
      state.timeDilationOn = false;
    }
  }

  // Subtract effective time
  state.timeLeft -= realDelta * factor;

  // *** The famous 16:30 reset troll ***
  if (!state.allowFinishThisRun && state.timeLeft <= RESET_AT_SECONDS) {
    state.timeLeft = BASE_SECONDS;
    setDisplay();
    log("⟲ Timer reset at 16:30 for your own ‘productivity’. You’re welcome.");
    cycleQuote();
    if (Math.random() < 0.5) whisper("Looping back… because perfection takes time.");
    requestAnimationFrame(tick);
    return;
  }

  // Normal finishing path (very rare)
  if (state.timeLeft <= 0 && state.allowFinishThisRun) {
    state.timeLeft = 0;
    setDisplay();
    state.running = false;
    clearInterval(state.glitchTimerId);
    clearTimeout(state.whisperTimerId);
    congrats();
    return;
  }

  setDisplay();
  requestAnimationFrame(tick);
}

// --- Random backward “cosmic” jumps ---
function scheduleGlitch() {
  clearInterval(state.glitchTimerId);
  state.glitchTimerId = setInterval(() => {
    if (!state.running) return;
    if (Math.random() < 0.65) {
      const jump = 60 + Math.round(Math.random()*240); // 1–5 minutes
      state.timeLeft = Math.min(BASE_SECONDS, state.timeLeft + jump);
      log(`✨ Cosmic productivity glitch: +${Math.round(jump/60)} min granted.`);
      whisper("Oops… time just stretched.");
      setDisplay();
    }
  }, 25_000 + Math.random()*15_000); // ~25–40s
}

// --- Unstoppable Mode (anti-close theatrics + companion) ---
window.onbeforeunload = (e) => {
  if (!UNSTOP.checked) return;
  e.preventDefault();
  e.returnValue = "Productivity can’t be stopped!";
  // Browsers may block auto-open. This is intentionally comedic.
};

UNSTOP.addEventListener('change', () => {
  if (UNSTOP.checked) {
    log("⛔ Unstoppable Mode armed. Closing tabs is an act of cowardice.");
    // On a user gesture (toggle), try to spawn a companion window that can “respawn” us.
    openCompanionWindow();
  } else {
    log("✅ Unstoppable Mode disarmed. You may retreat… for now.");
    if (state.companion && !state.companion.closed) {
      try { state.companion.close(); } catch {}
    }
  }
});

function openCompanionWindow(){
  try {
    // Open a tiny companion (allowed due to user gesture)
    const w = window.open("", "eternal_companion", "width=420,height=260");
    if (!w) {
      log("🔒 Popup blocked. Even the browser respects your boundaries.");
      return;
    }
    state.companion = w;
    const html = `
      <!doctype html><meta charset="utf-8">
      <title>Companion — Eternal Pomodoro</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,Arial;background:#0f1220;color:#e8ecff;
             display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .card{background:#161a2b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;max-width:340px;text-align:center}
        b{color:#6f8cff}
        button{margin-top:10px;background:#6f8cff;border:none;color:white;padding:10px 14px;border-radius:10px;cursor:pointer}
        small{display:block;color:#97a0c3;margin-top:8px}
      </style>
      <div class="card">
        <h3>Companion Active</h3>
        <p>Keeping your <b>productivity</b> ‘alive’… even if you run away.</p>
        <button id="respawn">Respawn Main App</button>
        <small>Note: some browsers block auto-opening. Click if lost.</small>
        <div id="status"></div>
      </div>
      <script>
        const status = document.getElementById('status');
        function ping(){
          try {
            if (window.opener && !window.opener.closed) {
              status.textContent = "Main app is alive ✨";
            } else {
              status.textContent = "Main app missing. Ready to respawn.";
            }
          } catch (e) { status.textContent = "Cannot verify main app."; }
        }
        setInterval(ping, 1500); ping();
        document.getElementById('respawn').onclick = () => {
          try {
            if (!window.opener || window.opener.closed) {
              window.open(location.href, '_blank');
            } else {
              window.opener.focus();
            }
          } catch(e){}
        };
      </script>
    `;
    w.document.open(); w.document.write(html); w.document.close();
  } catch (e) {
    log("🤷 Companion window failed to open. The browser said ‘no’.");
  }
}

// --- Controls ---
START.addEventListener('click', () => {
  if (state.running) return;
  // 5% chance to allow an actual finish per run
  state.allowFinishThisRun = Math.random() < 0.05;
  state.running = true;
  state.lastTick = null;
  scheduleGlitchesAndWhispers();
  log(state.allowFinishThisRun
    ? "🎲 Fate smiles upon you… finishing might be possible (eventually)."
    : "🔁 Focus session engaged. Completion is a myth.");
  // If unstoppable already on, ensure companion exists (gesture happened)
  if (UNSTOP.checked && (!state.companion || state.companion.closed)) {
    openCompanionWindow();
  }
  requestAnimationFrame(tick);
});

PAUSE.addEventListener('click', () => {
  state.running = false;
  log("⏸️ Paused. Time is pretending to wait for you.");
});

RESET.addEventListener('click', () => {
  state.running = false;
  state.timeLeft = BASE_SECONDS;
  state.lastTick = null;
  setDisplay();
  clearInterval(state.glitchTimerId);
  clearTimeout(state.whisperTimerId);
  log("♻️ Reset. New loop, same fate.");
});

function scheduleGlitchesAndWhispers(){
  scheduleGlitch();
  scheduleWhispers();
}

function congrats(){
  log("🏆 You have earned… 1 imaginary productivity point.");
  QUOTE.textContent = "Legend says someone finished once. It was you. Probably.";
  tryConfetti();
  alert("🏆 Congrats! You finished. Reward: 1 imaginary productivity point.");
}

// lightweight confetti-ish fallback
function tryConfetti(){
  for (let i=0;i<10;i++){
    setTimeout(()=>log("🎉"), i*120);
  }
}

// init
setDisplay();

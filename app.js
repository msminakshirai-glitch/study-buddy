import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app-check.js";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js";

const firebaseConfig = {
  apiKey: "AIzaSyDuU0vDpraS71N-CmCY4sv87xdR2VqZwAo",
  authDomain: "study-buddy-5b69a.firebaseapp.com",
  projectId: "study-buddy-5b69a",
  storageBucket: "study-buddy-5b69a.firebasestorage.app",
  messagingSenderId: "956089898373",
  appId: "1:956089898373:web:87a382364e19269a3d60ec"
};

self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("placeholder-key"),
  isTokenAutoRefreshEnabled: true
});
const ai = getAI(app, { backend: new GoogleAIBackend() });

// ---------- settings ----------
const SHORT_LIMIT = 1500;

const THEMES = {
  calm:      { animal: "🐼", bg: "#e8f1fb", text: "#1f3a5f", tone: "Use a calm, gentle tone." },
  energetic: { animal: "🦊", bg: "#fff1e0", text: "#7a3b00", tone: "Be short, upbeat and fast." },
  stressed:  { animal: "🐢", bg: "#e9f6ec", text: "#1f5130", tone: "Be very gentle and explain one small step at a time." }
};

const BADGES = [
  { seconds: 30,  label: "Bronze" },
  { seconds: 120, label: "Silver" },
  { seconds: 300, label: "Gold" }
];

// ---------- page elements ----------
const moodSelect = document.getElementById("mood");
const faceBox = document.getElementById("face");
const faceMsg = document.getElementById("faceMsg");
const timerBox = document.getElementById("timer");
const startStopButton = document.getElementById("startStop");
const badgesBox = document.getElementById("badges");
const taskSelect = document.getElementById("task");
const questionBox = document.getElementById("question");
const askButton = document.getElementById("ask");
const answerBox = document.getElementById("answer");
const sourceBox = document.getElementById("source");

// ---------- state ----------
let currentTheme = "calm";
let sessionSeconds = 0;
let running = false;
let timerId = null;
let wasAway = false;
let earned = loadBadges();

// ---------- badges and storage ----------
function loadBadges() {
  try {
    return JSON.parse(localStorage.getItem("badges")) || [];
  } catch (e) {
    return [];
  }
}

function saveBadges() {
  try {
    localStorage.setItem("badges", JSON.stringify(earned));
  } catch (e) {
    console.warn("Could not save badges", e);
  }
}

function showBadges() {
  if (earned.length === 0) {
    badgesBox.textContent = "none yet";
    return;
  }
  badgesBox.textContent = earned.map((id) => {
    const [theme, label] = id.split("-");
    return THEMES[theme].animal + " " + label;
  }).join("   ");
}

function checkBadges() {
  for (const b of BADGES) {
    const id = currentTheme + "-" + b.label;
    if (sessionSeconds >= b.seconds && !earned.includes(id)) {
      earned.push(id);
      saveBadges();
      showBadges();
      faceBox.textContent = "🎉";
      faceMsg.textContent = "You earned the " + b.label + " " + THEMES[currentTheme].animal + " badge!";
      setTimeout(() => { faceBox.textContent = THEMES[currentTheme].animal; }, 3000);
    }
  }
}

// ---------- theme ----------
function applyTheme() {
  const t = THEMES[currentTheme];
  document.body.style.background = t.bg;
  document.body.style.color = t.text;
  faceBox.textContent = t.animal;
  showBadges();
}

moodSelect.addEventListener("change", () => {
  currentTheme = moodSelect.value;
  applyTheme();
});

// ---------- timer and focus mode ----------
function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return m + ":" + s;
}

function isAway() {
  return document.visibilityState !== "visible" || !document.hasFocus();
}

function tick() {
  if (isAway()) {
    wasAway = true;
    return;
  }
  sessionSeconds += 1;
  timerBox.textContent = formatTime(sessionSeconds);
  checkBadges();
}

startStopButton.addEventListener("click", () => {
  if (!running) {
    running = true;
    sessionSeconds = 0;
    wasAway = false;
    timerBox.textContent = "00:00";
    timerId = setInterval(tick, 1000);
    startStopButton.textContent = "Stop";
    faceMsg.textContent = "Let's focus together!";
  } else {
    running = false;
    clearInterval(timerId);
    startStopButton.textContent = "Start focus";
    faceMsg.textContent = "Nice work! You studied for " + formatTime(sessionSeconds) + ".";
  }
});

function welcomeBack() {
  if (running && wasAway && !isAway()) {
    wasAway = false;
    faceMsg.textContent = "You were away, so I paused your timer. Welcome back!";
  }
}

document.addEventListener("visibilitychange", welcomeBack);
window.addEventListener("focus", welcomeBack);

// ---------- AI: hybrid routing ----------
async function askModel(prompt, mode) {
  const model = getGenerativeModel(ai, { mode: mode });
  const result = await model.generateContent(prompt);
  return {
    text: result.response.text(),
    source: String(result.response.inferenceSource).toLowerCase()
  };
}

function splitIntoChunks(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function summarizeOffline(text) {
  const pieces = splitIntoChunks(text, SHORT_LIMIT);
  const partials = [];
  for (const piece of pieces) {
    const r = await askModel("Summarize briefly for a student, in plain text:\n" + piece, InferenceMode.ONLY_ON_DEVICE);
    partials.push(r.text);
  }
  const combined = partials.join("\n");
  if (pieces.length > 1 && combined.length > SHORT_LIMIT && combined.length < text.length) {
    return summarizeOffline(combined);
  }
  if (pieces.length > 1) {
    const final = await askModel("Combine these notes into one short summary, in plain text:\n" + combined, InferenceMode.ONLY_ON_DEVICE);
    return final.text;
  }
  return combined;
}

askButton.addEventListener("click", async () => {
  const input = questionBox.value.trim();
  if (input === "") {
    return;
  }
  const tone = THEMES[currentTheme].tone;
  const instruction =
    (taskSelect.value === "summarize" ? "Summarize this for a student" : "Explain this simply for a student") +
    ". " + tone + " Use plain text only, with no markdown or asterisks.\n";
  const prompt = instruction + input;

  answerBox.textContent = "Thinking...";
  sourceBox.textContent = "";
  faceMsg.textContent = "Let me think...";

  try {
    if (input.length <= SHORT_LIMIT) {
      const r = await askModel(prompt, InferenceMode.PREFER_ON_DEVICE);
      answerBox.textContent = r.text;
      sourceBox.textContent = r.source === "on_device" ? "🏠 Answered on your device" : "☁️ Answered in the cloud";
    } else {
      try {
        const r = await askModel(prompt, InferenceMode.ONLY_IN_CLOUD);
        answerBox.textContent = r.text;
        sourceBox.textContent = "☁️ Answered in the cloud";
      } catch (cloudError) {
        console.warn("Cloud not available, using offline summary", cloudError);
        const text = await summarizeOffline(input);
        answerBox.textContent = text;
        sourceBox.textContent = "🏠 Offline summary, may miss details";
      }
    }
    faceMsg.textContent = "Here you go!";
  } catch (error) {
    answerBox.textContent = "Error: " + error.message;
    faceMsg.textContent = "Oops, something went wrong.";
    console.error(error);
  }
});

// ---------- start ----------
applyTheme();
faceMsg.textContent = "Hi! Pick your mood and start focusing.";
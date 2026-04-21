// CodeHelper AI — vanilla JS frontend
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3000/chat"
  : "/chat"; // change for production deployment

const STORAGE_KEY = "codehelper.history.v1";
const SETTINGS_KEY = "codehelper.settings.v1";

const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const form = $("form");
const input = $("input");
const sendBtn = $("send");
const tempEl = $("temperature");
const tempVal = $("tempVal");
const topPEl = $("topP");
const topPVal = $("topPVal");
const styleEl = $("style");
const themeEl = $("theme");
const clearBtn = $("clear");

let messages = [];

// --- Persistence ---
try {
  const h = localStorage.getItem(STORAGE_KEY);
  if (h) messages = JSON.parse(h);
  const s = localStorage.getItem(SETTINGS_KEY);
  if (s) {
    const p = JSON.parse(s);
    tempEl.value = p.temperature ?? 0.7;
    topPEl.value = p.topP ?? 0.9;
    styleEl.value = p.style ?? "factual";
    themeEl.checked = p.dark ?? true;
  }
} catch {}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    temperature: parseFloat(tempEl.value),
    topP: parseFloat(topPEl.value),
    style: styleEl.value,
    dark: themeEl.checked,
  }));
}
function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

// --- UI rendering ---
function render() {
  messagesEl.innerHTML = "";
  if (messages.length === 0) {
    messagesEl.innerHTML = `<div class="empty"><h2>Ask me anything about code</h2><p>I'm restricted to programming, debugging, and software development.</p></div>`;
    return;
  }
  for (const m of messages) {
    const div = document.createElement("div");
    div.className = `bubble ${m.role === "user" ? "user" : "bot"}`;
    div.textContent = m.content;
    messagesEl.appendChild(div);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping(on) {
  let el = document.getElementById("typing");
  if (on && !el) {
    el = document.createElement("div");
    el.id = "typing";
    el.className = "bubble bot typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else if (!on && el) {
    el.remove();
  }
}

function showError(msg) {
  const div = document.createElement("div");
  div.className = "error";
  div.textContent = msg;
  messagesEl.appendChild(div);
}

// --- Send ---
async function send() {
  const text = input.value.trim();
  if (!text) return;
  messages.push({ role: "user", content: text });
  input.value = "";
  saveHistory();
  render();
  sendBtn.disabled = true;
  showTyping(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-12),
        temperature: parseFloat(tempEl.value),
        topP: parseFloat(topPEl.value),
        style: styleEl.value,
      }),
    });
    const data = await res.json();
    showTyping(false);
    if (!res.ok || data.error) {
      showError(data.error || `Request failed (${res.status})`);
    } else {
      messages.push({ role: "assistant", content: data.reply });
      saveHistory();
      render();
    }
  } catch (e) {
    showTyping(false);
    showError("Network error: " + e.message);
  } finally {
    sendBtn.disabled = false;
  }
}

// --- Events ---
form.addEventListener("submit", (e) => { e.preventDefault(); send(); });
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
tempEl.addEventListener("input", () => { tempVal.textContent = parseFloat(tempEl.value).toFixed(2); saveSettings(); });
topPEl.addEventListener("input", () => { topPVal.textContent = parseFloat(topPEl.value).toFixed(2); saveSettings(); });
styleEl.addEventListener("change", saveSettings);
themeEl.addEventListener("change", () => { document.body.classList.toggle("dark", themeEl.checked); saveSettings(); });
clearBtn.addEventListener("click", () => { messages = []; saveHistory(); render(); });

// Initial sync
tempVal.textContent = parseFloat(tempEl.value).toFixed(2);
topPVal.textContent = parseFloat(topPEl.value).toFixed(2);
document.body.classList.toggle("dark", themeEl.checked);
render();

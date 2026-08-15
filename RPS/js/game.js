/**
 * אבן • נייר • מספריים – גרסה משופרת
 * כולל: מצב כהה/בהיר, localStorage, סטטיסטיקות, אנימציות, צלילים, רצף ניצחונות
 */

const Game = {
  // ===== State =====
  state: {
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    maxStreak: 0,
    history: [], // { user, computer, result, time }
    choicesCount: { rock: 0, paper: 0, scissors: 0 },
    theme: "light",
    soundEnabled: true,
    isPlaying: false,
  },

  options: ["rock", "paper", "scissors"],

  resultImages: {
    "rock-scissors": "images/RS.png",
    "rock-paper": "images/RP.png",
    "rock-rock": "images/RR.png",
    "paper-rock": "images/PR.png",
    "paper-scissors": "images/PS.png",
    "paper-paper": "images/PP.png",
    "scissors-rock": "images/SR.png",
    "scissors-paper": "images/SP.png",
    "scissors-scissors": "images/SS.png",
  },

  choicesText: {
    rock: "אבן",
    paper: "נייר",
    scissors: "מספריים",
  },

  winMessages: {
    "rock-scissors": [
      "ניצחת! אבן שוברת מספריים 💪",
      "כל הכבוד! האבן ניצחה!",
      "אבן חזקה! ניצחון!",
    ],
    "paper-rock": [
      "ניצחת! נייר עוטף אבן 📄",
      "יפה! הנייר ניצח!",
      "עוטף ומנצח!",
    ],
    "scissors-paper": [
      "ניצחת! מספריים חותכים נייר ✂️",
      "חתכת יפה! ניצחון!",
      "מספריים חדות – ניצחת!",
    ],
  },

  loseMessages: {
    "rock-paper": [
      "הפסדת... נייר עוטף אבן 😕",
      "אוי, הנייר ניצח הפעם",
      "המחשב עטף אותך!",
    ],
    "paper-scissors": [
      "הפסדת... מספריים חותכים נייר ✂️",
      "נחתכת! נסה שוב",
      "המספריים ניצחו הפעם",
    ],
    "scissors-rock": [
      "הפסדת... אבן שוברת מספריים 🪨",
      "נשברת! המחשב ניצח",
      "האבן הייתה חזקה מדי",
    ],
  },

  drawMessages: [
    "תיקו! 🤝",
    "תיקו מושלם!",
    "שניכם בחרתם אותו דבר!",
    "תיקו – נסה שוב!",
  ],

  // ===== Init =====
  init() {
    this.loadFromStorage();
    this.applyTheme();
    this.bindEvents();
    this.updateUI();
    this.preloadImages();
  },

  // ===== Storage =====
  loadFromStorage() {
    try {
      const saved = localStorage.getItem("rps-game-v2");
      if (saved) {
        const data = JSON.parse(saved);
        Object.assign(this.state, {
          wins: data.wins || 0,
          losses: data.losses || 0,
          draws: data.draws || 0,
          streak: data.streak || 0,
          maxStreak: data.maxStreak || 0,
          history: data.history || [],
          choicesCount: data.choicesCount || { rock: 0, paper: 0, scissors: 0 },
          theme: data.theme || "light",
          soundEnabled: data.soundEnabled !== false,
        });
      }

      // Prefer system theme if never set
      if (!localStorage.getItem("rps-game-v2")) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        this.state.theme = prefersDark ? "dark" : "light";
      }
    } catch (e) {
      console.warn("Could not load from localStorage", e);
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem(
        "rps-game-v2",
        JSON.stringify({
          wins: this.state.wins,
          losses: this.state.losses,
          draws: this.state.draws,
          streak: this.state.streak,
          maxStreak: this.state.maxStreak,
          history: this.state.history.slice(0, 20),
          choicesCount: this.state.choicesCount,
          theme: this.state.theme,
          soundEnabled: this.state.soundEnabled,
        })
      );
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  },

  // ===== Theme =====
  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.state.theme);
    const btn = document.getElementById("theme-btn");
    if (btn) {
      btn.textContent = this.state.theme === "dark" ? "☀️" : "🌙";
      btn.setAttribute("aria-label", this.state.theme === "dark" ? "מצב בהיר" : "מצב כהה");
    }
  },

  toggleTheme() {
    this.state.theme = this.state.theme === "dark" ? "light" : "dark";
    this.applyTheme();
    this.saveToStorage();
  },

  // ===== Events =====
  bindEvents() {
    // Choice buttons
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        if (choice) this.play(choice);
      });
    });

    // Action buttons
    document.getElementById("reset-btn")?.addEventListener("click", () => this.reset());
    document.getElementById("rules-btn")?.addEventListener("click", () => this.showRules());
    document.getElementById("stats-btn")?.addEventListener("click", () => this.showStats());
    document.getElementById("sound-btn")?.addEventListener("click", () => this.toggleSound());
    document.getElementById("theme-btn")?.addEventListener("click", () => this.toggleTheme());

    // Close modals
    document.getElementById("overlay")?.addEventListener("click", () => this.hideAllModals());
    document.getElementById("close-rules")?.addEventListener("click", () => this.hideRules());
    document.getElementById("close-stats")?.addEventListener("click", () => this.hideStats());

    // Keyboard support (works with number row and numpad)
    document.addEventListener("keydown", (e) => {
      // Ignore if typing in an input/textarea (future-proof)
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        this.hideAllModals();
        return;
      }

      // Don't play while a modal is open
      const modalOpen =
        document.getElementById("rules-popup")?.classList.contains("visible") ||
        document.getElementById("stats-popup")?.classList.contains("visible");
      if (modalOpen) return;

      const key = e.key;
      const code = e.code;

      if (key === "1" || code === "Digit1" || code === "Numpad1") {
        e.preventDefault();
        this.play("rock");
      } else if (key === "2" || code === "Digit2" || code === "Numpad2") {
        e.preventDefault();
        this.play("paper");
      } else if (key === "3" || code === "Digit3" || code === "Numpad3") {
        e.preventDefault();
        this.play("scissors");
      }
    });
  },

  // ===== Core Game =====
  play(userChoice) {
    if (this.state.isPlaying) return;
    this.state.isPlaying = true;

    // Disable buttons briefly
    document.querySelectorAll(".choice-btn").forEach((b) => b.classList.add("disabled"));

    // Thinking animation
    document.querySelectorAll(".choice-btn").forEach((b) => b.classList.add("thinking"));

    // Short delay for drama
    setTimeout(() => {
      document.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("thinking"));

      const computerChoice = this.options[Math.floor(Math.random() * this.options.length)];
      this.state.choicesCount[userChoice]++;

      // Show result image
      const resultKey = `${userChoice}-${computerChoice}`;
      const resultImage = document.getElementById("result-image");
      const container = document.getElementById("result-container");

      resultImage.src = this.resultImages[resultKey];
      resultImage.alt = `${this.choicesText[userChoice]} נגד ${this.choicesText[computerChoice]}`;
      container.classList.add("visible");

      // VS text
      const vsArea = document.getElementById("vs-area");
      vsArea.textContent = `${this.choicesText[computerChoice]} נגד ${this.choicesText[userChoice]}`;
      vsArea.classList.add("visible");

      // Determine result
      let resultType;
      let message;

      if (userChoice === computerChoice) {
        resultType = "draw";
        message = this.pickRandom(this.drawMessages);
        this.state.draws++;
        this.state.streak = 0;
        this.playSound("draw");
      } else if (
        (userChoice === "rock" && computerChoice === "scissors") ||
        (userChoice === "paper" && computerChoice === "rock") ||
        (userChoice === "scissors" && computerChoice === "paper")
      ) {
        resultType = "win";
        message = this.pickRandom(this.winMessages[`${userChoice}-${computerChoice}`]);
        this.state.wins++;
        this.state.streak++;
        if (this.state.streak > this.state.maxStreak) {
          this.state.maxStreak = this.state.streak;
        }
        this.playSound("win");
      } else {
        resultType = "lose";
        message = this.pickRandom(this.loseMessages[`${userChoice}-${computerChoice}`]);
        this.state.losses++;
        this.state.streak = 0;
        this.playSound("lose");
      }

      // History
      this.state.history.unshift({
        user: userChoice,
        computer: computerChoice,
        result: resultType,
        time: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      });
      if (this.state.history.length > 20) this.state.history.pop();

      // Update result text
      const resultEl = document.getElementById("result-text");
      resultEl.textContent = message;
      resultEl.className = `result-display ${resultType} animate`;

      // Remove animation class after it finishes
      setTimeout(() => resultEl.classList.remove("animate"), 600);

      this.updateUI();
      this.saveToStorage();

      // Re-enable buttons
      setTimeout(() => {
        document.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("disabled"));
        this.state.isPlaying = false;
      }, 400);
    }, 450);
  },

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // ===== UI Updates =====
  updateUI() {
    const scoreEl = document.getElementById("score");
    if (scoreEl) {
      scoreEl.innerHTML = `אתה: <strong>${this.state.wins}</strong> &nbsp;|&nbsp; מחשב: <strong>${this.state.losses}</strong>`;
    }

    // Stats bar
    const total = this.state.wins + this.state.losses + this.state.draws;
    const winRate = total > 0 ? Math.round((this.state.wins / total) * 100) : 0;

    const streakEl = document.getElementById("streak-stat");
    if (streakEl) {
      streakEl.textContent = this.state.streak > 0 ? `🔥 רצף: ${this.state.streak}` : "רצף: 0";
      streakEl.classList.toggle("streak", this.state.streak >= 3);
    }

    const rateEl = document.getElementById("rate-stat");
    if (rateEl) rateEl.textContent = `ניצחונות: ${winRate}%`;

    const drawsEl = document.getElementById("draws-stat");
    if (drawsEl) drawsEl.textContent = `תיקו: ${this.state.draws}`;

    // Sound button
    const soundBtn = document.getElementById("sound-btn");
    if (soundBtn) {
      soundBtn.innerHTML = this.state.soundEnabled
        ? `<span aria-hidden="true">🔊</span> צליל`
        : `<span aria-hidden="true">🔇</span> צליל`;
    }
  },

  // ===== Reset =====
  reset() {
    if (!confirm("האם לאפס את כל הניקוד והסטטיסטיקות?")) return;

    this.state.wins = 0;
    this.state.losses = 0;
    this.state.draws = 0;
    this.state.streak = 0;
    this.state.maxStreak = 0;
    this.state.history = [];
    this.state.choicesCount = { rock: 0, paper: 0, scissors: 0 };

    document.getElementById("result-text").textContent = "";
    document.getElementById("result-text").className = "result-display";
    document.getElementById("vs-area").textContent = "";
    document.getElementById("vs-area").classList.remove("visible");
    document.getElementById("result-container").classList.remove("visible");

    this.updateUI();
    this.saveToStorage();
  },

  // ===== Modals =====
  showRules() {
    document.getElementById("overlay").classList.add("visible");
    document.getElementById("rules-popup").classList.add("visible");
  },

  hideRules() {
    document.getElementById("rules-popup").classList.remove("visible");
    document.getElementById("overlay").classList.remove("visible");
  },

  showStats() {
    const total = this.state.wins + this.state.losses + this.state.draws;
    const winRate = total > 0 ? Math.round((this.state.wins / total) * 100) : 0;

    document.getElementById("stat-wins").textContent = this.state.wins;
    document.getElementById("stat-losses").textContent = this.state.losses;
    document.getElementById("stat-draws").textContent = this.state.draws;
    document.getElementById("stat-rate").textContent = winRate + "%";
    document.getElementById("stat-streak").textContent = this.state.maxStreak;
    document.getElementById("stat-total").textContent = total;

    // Choice distribution
    const c = this.state.choicesCount;
    const totalChoices = c.rock + c.paper + c.scissors || 1;
    document.getElementById("stat-rock").textContent =
      Math.round((c.rock / totalChoices) * 100) + "%";
    document.getElementById("stat-paper").textContent =
      Math.round((c.paper / totalChoices) * 100) + "%";
    document.getElementById("stat-scissors").textContent =
      Math.round((c.scissors / totalChoices) * 100) + "%";

    // History
    const historyEl = document.getElementById("history-list");
    if (this.state.history.length === 0) {
      historyEl.innerHTML = '<div class="history-item">עדיין אין היסטוריה</div>';
    } else {
      historyEl.innerHTML = this.state.history
        .slice(0, 10)
        .map((h) => {
          const icon = h.result === "win" ? "✅" : h.result === "lose" ? "❌" : "🤝";
          return `<div class="history-item">${icon} ${this.choicesText[h.user]} נגד ${this.choicesText[h.computer]} <small>(${h.time})</small></div>`;
        })
        .join("");
    }

    document.getElementById("overlay").classList.add("visible");
    document.getElementById("stats-popup").classList.add("visible");
  },

  hideStats() {
    document.getElementById("stats-popup").classList.remove("visible");
    document.getElementById("overlay").classList.remove("visible");
  },

  hideAllModals() {
    this.hideRules();
    this.hideStats();
  },

  // ===== Sound (Web Audio API – no external files needed) =====
  toggleSound() {
    this.state.soundEnabled = !this.state.soundEnabled;
    this.updateUI();
    this.saveToStorage();
  },

  playSound(type) {
    if (!this.state.soundEnabled) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "win") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "lose") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // draw
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio not supported – silently ignore
    }
  },

  // ===== Preload =====
  preloadImages() {
    Object.values(this.resultImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    ["rock", "paper", "scissors"].forEach((c) => {
      const img = new Image();
      img.src = `images/${c}.png`;
    });
  },
};

// Start
document.addEventListener("DOMContentLoaded", () => Game.init());

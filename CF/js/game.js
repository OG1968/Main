// ===================== Audio (from audio/ folder) =====================
const SFX = {
  drop:  new Audio('audio/drop.wav'),
  click: new Audio('audio/click.wav'),
  win:   new Audio('audio/win.wav'),
  lose:  new Audio('audio/lose.wav'),
  bomb:  new Audio('audio/bomb.wav'),
  hint:  new Audio('audio/hint.wav')
};
// Preload + lower volume
Object.values(SFX).forEach(a => { a.preload = 'auto'; a.volume = 0.45; });

function initAudio() {
  // Unlock audio on first user gesture (required by browsers)
  Object.values(SFX).forEach(a => {
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });
}
function playSfx(name) {
  const a = SFX[name];
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) {}
}
function playDrop()  { playSfx('drop'); }
function playWin()   { playSfx('win'); }
function playLose()  { playSfx('lose'); }
function playClick() { playSfx('click'); }
function playBomb()  { playSfx('bomb'); }
function playHint()  { playSfx('hint'); }

// ===================== State =====================
let ROWS = 6, COLS = 7;
const HUMAN = 1, AI = 2, EMPTY = 0;
const DEPTHS = { easy: 2, medium: 4, hard: 5 };

let board = [];
let currentPlayer = HUMAN;
let gameOver = false;
let isAnimating = false;
let scores = { human: 0, ai: 0, draw: 0, total: 0 };
let history = [];
let bombLeft = 1;
let lastHintCol = -1;

const boardEl = document.getElementById('board');
const boardWrapper = document.getElementById('boardWrapper');
const statusEl = document.getElementById('status');
const difficultyEl = document.getElementById('difficulty');
const boardSizeEl = document.getElementById('boardSize');
const colorPlayerEl = document.getElementById('colorPlayer');
const colorAIEl = document.getElementById('colorAI');
const chaosEl = document.getElementById('chaosMode');
const themeBtn = document.getElementById('themeBtn');
const restartBtn = document.getElementById('restartBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const playAgainBtn = document.getElementById('playAgainBtn');
const powerBomb = document.getElementById('powerBomb');
const powerUndo = document.getElementById('powerUndo');
const powerHint = document.getElementById('powerHint');
const bombCountEl = document.getElementById('bombCount');

// ===================== Persistence =====================
function loadScores() {
  try {
    const s = JSON.parse(localStorage.getItem('c4-scores-v2'));
    if (s) scores = { ...scores, ...s };
  } catch {}
  updateScores();
}
function saveScores() {
  localStorage.setItem('c4-scores-v2', JSON.stringify(scores));
}
function loadPrefs() {
  const theme = localStorage.getItem('c4-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(theme);
  const p = localStorage.getItem('c4-player-color');
  const a = localStorage.getItem('c4-ai-color');
  if (p) { colorPlayerEl.value = p; document.documentElement.style.setProperty('--player', p); }
  if (a) { colorAIEl.value = a; document.documentElement.style.setProperty('--ai', a); }
  const size = localStorage.getItem('c4-board-size');
  if (size) boardSizeEl.value = size;
  const diff = localStorage.getItem('c4-difficulty');
  if (diff) difficultyEl.value = diff;
}
function savePrefs() {
  localStorage.setItem('c4-player-color', colorPlayerEl.value);
  localStorage.setItem('c4-ai-color', colorAIEl.value);
  localStorage.setItem('c4-board-size', boardSizeEl.value);
  localStorage.setItem('c4-difficulty', difficultyEl.value);
}

// ===================== Theme & Colors =====================
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('c4-theme', t);
}
themeBtn.addEventListener('click', () => {
  initAudio(); playClick();
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
colorPlayerEl.addEventListener('input', () => {
  document.documentElement.style.setProperty('--player', colorPlayerEl.value);
  savePrefs(); updateStatus();
});
colorAIEl.addEventListener('input', () => {
  document.documentElement.style.setProperty('--ai', colorAIEl.value);
  savePrefs();
});

// ===================== Board Size =====================
function applyBoardSize() {
  const val = boardSizeEl.value;
  if (val === '7x8') { ROWS = 7; COLS = 8; }
  else if (val === '8x9') { ROWS = 8; COLS = 9; }
  else { ROWS = 6; COLS = 7; }
  savePrefs();
  restart(true);
}
boardSizeEl.addEventListener('change', () => { playClick(); applyBoardSize(); });
difficultyEl.addEventListener('change', () => { playClick(); savePrefs(); });

// ===================== Fit board to available space (no scroll) =====================
function fitBoard() {
  const area = document.querySelector('.board-area');
  if (!area) return;

  const availW = area.clientWidth;
  const availH = area.clientHeight;

  // Calculate max cell size that fits both width and height
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap')) || 6;
  const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--board-pad')) || 10;

  // Width constraint
  const cellFromW = (availW - pad * 2 - gap * (COLS - 1)) / COLS;
  // Height constraint
  const cellFromH = (availH - pad * 2 - gap * (ROWS - 1)) / ROWS;

  const cell = Math.max(12, Math.floor(Math.min(cellFromW, cellFromH)));

  const boardW = cell * COLS + gap * (COLS - 1) + pad * 2;
  const boardH = cell * ROWS + gap * (ROWS - 1) + pad * 2;

  boardWrapper.style.width = boardW + 'px';
  boardWrapper.style.height = boardH + 'px';
}

// ===================== Board Creation =====================
function createBoard() {
  boardEl.innerHTML = '';
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => handleClick(c));
      cell.addEventListener('mouseenter', () => showPreview(c));
      cell.addEventListener('mouseleave', clearPreview);
      boardEl.appendChild(cell);
    }
  }
  requestAnimationFrame(() => {
    fitBoard();
    // Second pass after layout settles
    requestAnimationFrame(fitBoard);
  });
}

window.addEventListener('resize', () => {
  fitBoard();
});

// Also react to orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(fitBoard, 150);
});

// ===================== Preview =====================
function showPreview(col) {
  if (gameOver || isAnimating || currentPlayer !== HUMAN) return;
  clearPreview();
  const row = getNextRow(col);
  if (row === -1) return;
  const cell = boardEl.children[row * COLS + col];
  if (!cell || cell.classList.contains('filled')) return;
  const prev = document.createElement('div');
  prev.className = 'preview-disc player';
  prev.id = 'preview';
  cell.appendChild(prev);
}
function clearPreview() {
  const p = document.getElementById('preview');
  if (p) p.remove();
}

// ===================== Core Logic =====================
function getNextRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === EMPTY) return r;
  return -1;
}
function isValidCol(col) { return col >= 0 && col < COLS && board[0][col] === EMPTY; }
function dropPiece(row, col, player) { board[row][col] = player; }

function checkWin(player) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===player && board[r][c+1]===player && board[r][c+2]===player && board[r][c+3]===player)
        return [[r,c],[r,c+1],[r,c+2],[r,c+3]];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS - 3; r++)
      if (board[r][c]===player && board[r+1][c]===player && board[r+2][c]===player && board[r+3][c]===player)
        return [[r,c],[r+1,c],[r+2,c],[r+3,c]];
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===player && board[r+1][c+1]===player && board[r+2][c+2]===player && board[r+3][c+3]===player)
        return [[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]];
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===player && board[r-1][c+1]===player && board[r-2][c+2]===player && board[r-3][c+3]===player)
        return [[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]];
  return null;
}
function isBoardFull() { return board[0].every(c => c !== EMPTY); }

// ===================== AI =====================
function evaluateWindow(win, player) {
  const opp = player === AI ? HUMAN : AI;
  let score = 0;
  const cp = win.filter(v => v === player).length;
  const co = win.filter(v => v === opp).length;
  const ce = win.filter(v => v === EMPTY).length;
  if (cp === 4) score += 100;
  else if (cp === 3 && ce === 1) score += 12;
  else if (cp === 2 && ce === 2) score += 3;
  if (co === 3 && ce === 1) score -= 10;
  return score;
}
function scorePosition(player) {
  let score = 0;
  const center = Math.floor(COLS / 2);
  score += board.map(r => r[center]).filter(v => v === player).length * 4;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      score += evaluateWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], player);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS - 3; r++)
      score += evaluateWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player);
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      score += evaluateWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      score += evaluateWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], player);
  return score;
}
function minimax(depth, alpha, beta, maximizing) {
  if (checkWin(AI)) return { score: 100000 + depth };
  if (checkWin(HUMAN)) return { score: -100000 - depth };
  if (isBoardFull() || depth === 0) return { score: scorePosition(AI) };

  const valid = [];
  for (let c = 0; c < COLS; c++) if (isValidCol(c)) valid.push(c);
  valid.sort((a, b) => Math.abs(a - Math.floor(COLS/2)) - Math.abs(b - Math.floor(COLS/2)));

  if (maximizing) {
    let maxE = -Infinity, best = valid[0];
    for (const col of valid) {
      const row = getNextRow(col);
      dropPiece(row, col, AI);
      const res = minimax(depth - 1, alpha, beta, false);
      board[row][col] = EMPTY;
      if (res.score > maxE) { maxE = res.score; best = col; }
      alpha = Math.max(alpha, res.score);
      if (beta <= alpha) break;
    }
    return { score: maxE, col: best };
  } else {
    let minE = Infinity, best = valid[0];
    for (const col of valid) {
      const row = getNextRow(col);
      dropPiece(row, col, HUMAN);
      const res = minimax(depth - 1, alpha, beta, true);
      board[row][col] = EMPTY;
      if (res.score < minE) { minE = res.score; best = col; }
      beta = Math.min(beta, res.score);
      if (beta <= alpha) break;
    }
    return { score: minE, col: best };
  }
}
function getAIMove() {
  let depth = DEPTHS[difficultyEl.value] || 4;
  if (COLS >= 9) depth = Math.max(2, depth - 1);
  if (difficultyEl.value === 'easy' && Math.random() < 0.4) {
    const valid = [];
    for (let c = 0; c < COLS; c++) if (isValidCol(c)) valid.push(c);
    return valid[Math.floor(Math.random() * valid.length)];
  }
  return minimax(depth, -Infinity, Infinity, true).col;
}

// ===================== Animations =====================
function animateDrop(col, row, player, callback) {
  isAnimating = true;
  clearPreview();
  const cells = boardEl.querySelectorAll('.cell');
  const target = cells[row * COLS + col];
  const rect = target.getBoundingClientRect();
  const wrapRect = boardWrapper.getBoundingClientRect();

  const disc = document.createElement('div');
  disc.className = `falling-disc ${player === HUMAN ? 'player' : 'ai'}`;
  const size = rect.width * 0.84;
  disc.style.width = size + 'px';
  disc.style.height = size + 'px';
  disc.style.left = (rect.left - wrapRect.left + (rect.width - size) / 2) + 'px';
  disc.style.top = '-24px';
  boardWrapper.appendChild(disc);

  disc.offsetHeight;
  disc.style.top = (rect.top - wrapRect.top + (rect.height - size) / 2) + 'px';

  setTimeout(() => {
    disc.remove();
    const permanent = document.createElement('div');
    permanent.className = `disc ${player === HUMAN ? 'player' : 'ai'} dropped bounce`;
    target.appendChild(permanent);
    target.classList.add('filled');
    playDrop();
    isAnimating = false;
    if (callback) callback();
  }, 360);
}

function spawnParticles(cells) {
  cells.forEach(([r, c]) => {
    const cell = boardEl.children[r * COLS + c];
    const rect = cell.getBoundingClientRect();
    const wrap = boardWrapper.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const color = Math.random() > 0.5
        ? getComputedStyle(document.documentElement).getPropertyValue('--player')
        : getComputedStyle(document.documentElement).getPropertyValue('--ai');
      p.style.background = color.trim();
      p.style.left = (rect.left - wrap.left + rect.width / 2) + 'px';
      p.style.top = (rect.top - wrap.top + rect.height / 2) + 'px';
      p.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
      p.style.setProperty('--ty', (Math.random() - 0.5) * 100 - 30 + 'px');
      boardWrapper.appendChild(p);
      setTimeout(() => p.remove(), 850);
    }
  });
}

function highlightWin(cells) {
  cells.forEach(([r, c]) => boardEl.children[r * COLS + c].classList.add('win'));
  spawnParticles(cells);
}

// ===================== Chaos =====================
function maybeChaos() {
  const mode = chaosEl.value;
  if (mode === 'off' || gameOver) return;
  const chance = mode === 'mild' ? 0.07 : 0.16;
  if (Math.random() > chance) return;

  const events = [
    () => {
      boardWrapper.classList.add('shake');
      setTimeout(() => boardWrapper.classList.remove('shake'), 400);
      statusEl.innerHTML = '🌋 רעידת אדמה!';
    },
    () => {
      if (bombLeft < 2) {
        bombLeft++;
        bombCountEl.textContent = bombLeft;
        powerBomb.disabled = false;
        statusEl.innerHTML = '🎁 פצצה נוספת!';
        playHint();
      }
    },
    () => {
      const colsWith = [];
      for (let c = 0; c < COLS; c++) {
        let cnt = 0;
        for (let r = 0; r < ROWS; r++) if (board[r][c] !== EMPTY) cnt++;
        if (cnt >= 2) colsWith.push(c);
      }
      if (!colsWith.length) return;
      const col = colsWith[Math.floor(Math.random() * colsWith.length)];
      const pieces = [];
      for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] !== EMPTY) pieces.push(r);
      if (pieces.length < 2) return;
      const i = Math.floor(Math.random() * (pieces.length - 1));
      const r1 = pieces[i], r2 = pieces[i + 1];
      const tmp = board[r1][col];
      board[r1][col] = board[r2][col];
      board[r2][col] = tmp;
      redrawCell(r1, col);
      redrawCell(r2, col);
      boardWrapper.classList.add('shake');
      setTimeout(() => boardWrapper.classList.remove('shake'), 400);
      statusEl.innerHTML = '🌀 כאוס כבידה!';
    }
  ];
  setTimeout(events[Math.floor(Math.random() * events.length)], 280);
}

function redrawCell(r, c) {
  const cell = boardEl.children[r * COLS + c];
  cell.innerHTML = '';
  cell.classList.remove('filled', 'win', 'hint');
  if (board[r][c] !== EMPTY) {
    const d = document.createElement('div');
    d.className = `disc ${board[r][c] === HUMAN ? 'player' : 'ai'} dropped`;
    cell.appendChild(d);
    cell.classList.add('filled');
  }
}

// ===================== UI =====================
function updateStatus() {
  if (gameOver) return;
  if (currentPlayer === HUMAN) {
    statusEl.innerHTML = `תורך <span class="dot" style="background:var(--player)"></span>`;
  } else {
    statusEl.innerHTML = `המחשב חושב... <span class="dot" style="background:var(--ai)"></span>`;
  }
}
function updateScores() {
  document.getElementById('scoreHuman').textContent = scores.human;
  document.getElementById('scoreAI').textContent = scores.ai;
  document.getElementById('scoreDraw').textContent = scores.draw;
  document.getElementById('scoreTotal').textContent = scores.total;
}
function showModal(title, text) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modal.classList.add('show');
}
function clearHints() {
  boardEl.querySelectorAll('.cell.hint').forEach(c => c.classList.remove('hint'));
  lastHintCol = -1;
}

// ===================== Handlers =====================
function handleClick(col) {
  if (gameOver || isAnimating || currentPlayer !== HUMAN) return;
  initAudio();
  if (!isValidCol(col)) {
    boardWrapper.classList.add('shake');
    setTimeout(() => boardWrapper.classList.remove('shake'), 350);
    return;
  }
  const row = getNextRow(col);
  if (row === -1) return;

  history.push(board.map(row => [...row]));
  dropPiece(row, col, HUMAN);
  clearHints();

  animateDrop(col, row, HUMAN, () => {
    const win = checkWin(HUMAN);
    if (win) {
      gameOver = true;
      highlightWin(win);
      scores.human++; scores.total++;
      saveScores(); updateScores();
      playWin();
      showModal('ניצחת! 🎉', 'כל הכבוד!');
      return;
    }
    if (isBoardFull()) {
      gameOver = true;
      scores.draw++; scores.total++;
      saveScores(); updateScores();
      showModal('תיקו', 'הלוח מלא');
      return;
    }
    currentPlayer = AI;
    updateStatus();
    maybeChaos();
    setTimeout(aiTurn, 380);
  });
}

function aiTurn() {
  if (gameOver) return;
  const col = getAIMove();
  const row = getNextRow(col);
  if (row === -1) return;

  history.push(board.map(r => [...r]));
  dropPiece(row, col, AI);

  animateDrop(col, row, AI, () => {
    const win = checkWin(AI);
    if (win) {
      gameOver = true;
      highlightWin(win);
      scores.ai++; scores.total++;
      saveScores(); updateScores();
      playLose();
      showModal('הפסדת 😔', 'המחשב ניצח');
      return;
    }
    if (isBoardFull()) {
      gameOver = true;
      scores.draw++; scores.total++;
      saveScores(); updateScores();
      showModal('תיקו', 'הלוח מלא');
      return;
    }
    currentPlayer = HUMAN;
    updateStatus();
    maybeChaos();
  });
}

// ===================== Powers =====================
powerBomb.addEventListener('click', () => {
  if (gameOver || isAnimating || bombLeft <= 0 || currentPlayer !== HUMAN) return;
  initAudio();
  const aiDiscs = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === AI) aiDiscs.push([r, c]);
  if (!aiDiscs.length) return;

  aiDiscs.sort((a, b) => a[0] - b[0]);
  const [r, c] = aiDiscs[Math.floor(Math.random() * Math.min(3, aiDiscs.length))];

  board[r][c] = EMPTY;
  for (let rr = r; rr > 0; rr--) {
    board[rr][c] = board[rr - 1][c];
    board[rr - 1][c] = EMPTY;
  }
  for (let rr = 0; rr < ROWS; rr++) redrawCell(rr, c);

  bombLeft--;
  bombCountEl.textContent = bombLeft;
  if (bombLeft <= 0) powerBomb.disabled = true;
  playBomb();
  boardWrapper.classList.add('shake');
  setTimeout(() => boardWrapper.classList.remove('shake'), 350);

  const win = checkWin(HUMAN);
  if (win) {
    gameOver = true;
    highlightWin(win);
    scores.human++; scores.total++;
    saveScores(); updateScores();
    playWin();
    showModal('ניצחת עם פצצה! 💣', 'איזה מהלך!');
  }
});

powerUndo.addEventListener('click', () => {
  if (gameOver || isAnimating || history.length < 2) return;
  initAudio(); playClick();
  history.pop();
  const prev = history.pop();
  board = prev.map(r => [...r]);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) redrawCell(r, c);
  currentPlayer = HUMAN;
  clearHints();
  updateStatus();
});

powerHint.addEventListener('click', () => {
  if (gameOver || isAnimating || currentPlayer !== HUMAN) return;
  initAudio(); playHint();
  clearHints();
  let bestCol = -1, bestScore = -Infinity;
  for (let c = 0; c < COLS; c++) {
    if (!isValidCol(c)) continue;
    const row = getNextRow(c);
    dropPiece(row, c, HUMAN);
    let score = scorePosition(HUMAN);
    if (checkWin(HUMAN)) score = 99999;
    board[row][c] = EMPTY;
    if (score > bestScore) { bestScore = score; bestCol = c; }
  }
  if (bestCol >= 0) {
    const row = getNextRow(bestCol);
    if (row >= 0) {
      boardEl.children[row * COLS + bestCol].classList.add('hint');
      lastHintCol = bestCol;
    }
  }
});

// ===================== Restart =====================
function restart(keepSize = false) {
  initAudio();
  if (!keepSize) playClick();
  gameOver = false;
  currentPlayer = HUMAN;
  isAnimating = false;
  history = [];
  bombLeft = 1;
  bombCountEl.textContent = '1';
  powerBomb.disabled = false;
  modal.classList.remove('show');
  boardWrapper.querySelectorAll('.falling-disc, .particle').forEach(el => el.remove());
  clearHints();
  createBoard();
  updateStatus();
}

restartBtn.addEventListener('click', () => restart());
playAgainBtn.addEventListener('click', () => restart());

document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= String(Math.min(COLS, 9))) handleClick(parseInt(e.key) - 1);
  if (e.key === 'u' || e.key === 'U') powerUndo.click();
  if (e.key === 'h' || e.key === 'H') powerHint.click();
  if (e.key === 'b' || e.key === 'B') powerBomb.click();
});

// ===================== Init =====================
loadPrefs();
loadScores();
const savedSize = boardSizeEl.value;
if (savedSize === '7x8') { ROWS = 7; COLS = 8; }
else if (savedSize === '8x9') { ROWS = 8; COLS = 9; }
createBoard();
updateStatus();

// Extra safety: re-fit after fonts/load
window.addEventListener('load', fitBoard);
setTimeout(fitBoard, 100);

// ==========================================
// GAME STATE & CONFIGURATION
// ==========================================
const state = {
  p1Name: "Player 1",
  p2Name: "Player 2",
  p1Score: 0,
  p2Score: 0,
  currentImageSrc: "",
  secretTitle: "",
  attemptsLeft: 3,
  activePlayer: 1,
  tilePositions: []
};

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const uploadScreen = document.getElementById('upload-screen');
const guessScreen = document.getElementById('guess-screen');
const revealScreen = document.getElementById('reveal-screen');

const btnStartMatch = document.getElementById('btn-start-match');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const secretTitleInput = document.getElementById('secret-title-input');
const btnLockPuzzle = document.getElementById('btn-lock-puzzle');

const guessInput = document.getElementById('guess-input');
const btnSubmitGuess = document.getElementById('btn-submit-guess');
const attemptsLeftSpan = document.getElementById('attempts-left');
const scoreboard = document.getElementById('scoreboard');

const turnIndicatorUpload = document.getElementById('turn-indicator-upload');
const turnIndicatorGuess = document.getElementById('turn-indicator-guess');
const revealImg = document.getElementById('reveal-img');
const revealedTitle = document.getElementById('revealed-title');
const resultStatus = document.getElementById('result-status');
const btnNextRound = document.getElementById('btn-next-round');

// Helper: Switch Screens
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Helper: Update Scoreboard UI
function updateScoreboard() {
  scoreboard.style.display = 'flex';
  scoreboard.innerHTML = `
    <span>${state.p1Name}: ${state.p1Score}</span>
    <span>${state.p2Name}: ${state.p2Score}</span>
  `;
}

// Helper: Update Turn Text
function updateTurnText() {
  const setter = state.activePlayer === 1 ? state.p1Name : state.p2Name;
  const guesser = state.activePlayer === 1 ? state.p2Name : state.p1Name;
  
  turnIndicatorUpload.innerText = `${setter}: Set the Puzzle`;
  turnIndicatorGuess.innerText = `${guesser}'s Turn to Guess!`;
}

// ==========================================
// 1. SETUP NAMES
// ==========================================
btnStartMatch.addEventListener('click', () => {
  const p1 = document.getElementById('p1-name-input').value.trim();
  const p2 = document.getElementById('p2-name-input').value.trim();
  
  if (p1) state.p1Name = p1;
  if (p2) state.p2Name = p2;

  updateScoreboard();
  updateTurnText();
  switchScreen('upload-screen');
});

// ==========================================
// 2. IMAGE UPLOAD & CLIPBOARD PASTE SUPPORT
// ==========================================
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleImageFile(file);
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});

dropZone.addEventListener('paste', (e) => {
  e.preventDefault();
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      handleImageFile(blob);
      break;
    }
  }
});

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    state.currentImageSrc = event.target.result;
    btnLockPuzzle.disabled = false;
    dropZone.querySelector('p').innerHTML = `✅ Image Loaded Successfully!`;
  };
  reader.readAsDataURL(file);
}

// ==========================================
// 3. LOCK IN PUZZLE & SETUP ZOOMED CROPS
// ==========================================
btnLockPuzzle.addEventListener('click', () => {
  const title = secretTitleInput.value.trim();
  
  if (!state.currentImageSrc) {
    alert("Please upload or paste an image first!");
    return;
  }
  if (!title) {
    alert("Please enter the movie/album title!");
    secretTitleInput.focus();
    return;
  }

  state.secretTitle = title;
  state.attemptsLeft = 3;
  attemptsLeftSpan.innerText = state.attemptsLeft;
  guessInput.value = "";
  guessInput.placeholder = "Type your guess...";

  setupFragmentBoard(state.currentImageSrc);
  updateFragmentVisibility();

  updateTurnText();
  switchScreen('guess-screen');
});

function setupFragmentBoard(imgSrc) {
  state.tilePositions = [];
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(Math.random() * 70) + 15;
    const y = Math.floor(Math.random() * 70) + 15;
    state.tilePositions.push(`${x}% ${y}%`);
  }

  for (let i = 0; i < 4; i++) {
    const tile = document.getElementById(`tile-${i}`);
    tile.style.backgroundImage = `url(${imgSrc})`;
    tile.style.backgroundPosition = state.tilePositions[i];
  }
}

function updateFragmentVisibility() {
  for (let i = 0; i < 4; i++) {
    const tile = document.getElementById(`tile-${i}`);
    let shouldShow = false;

    if (state.attemptsLeft === 3 && i === 0) shouldShow = true;
    if (state.attemptsLeft === 2 && i < 2) shouldShow = true;
    if (state.attemptsLeft === 1) shouldShow = true;

    if (shouldShow) {
      tile.classList.remove('hidden-tile');
    } else {
      tile.classList.add('hidden-tile');
    }
  }
}

// ==========================================
// 4. GUESSING LOGIC
// ==========================================
btnSubmitGuess.addEventListener('click', processGuess);
guessInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') processGuess();
});

function processGuess() {
  const userGuess = guessInput.value.trim().toLowerCase();
  const correctTitle = state.secretTitle.trim().toLowerCase();

  if (!userGuess) {
    guessInput.placeholder = "⚠️ Please type a guess first!";
    return;
  }

  const guesserName = state.activePlayer === 1 ? state.p2Name : state.p1Name;

  if (userGuess === correctTitle) {
    if (state.activePlayer === 1) {
      state.p2Score++;
    } else {
      state.p1Score++;
    }
    resultStatus.innerText = `🎉 Correct! ${guesserName} wins the round!`;
    endRound();
  } else {
    state.attemptsLeft--;
    attemptsLeftSpan.innerText = state.attemptsLeft;
    guessInput.value = "";

    updateFragmentVisibility();

    if (state.attemptsLeft <= 0) {
      const setterName = state.activePlayer === 1 ? state.p1Name : state.p2Name;
      resultStatus.innerText = `❌ Out of attempts! ${setterName} wins the round!`;
      if (state.activePlayer === 1) {
        state.p1Score++;
      } else {
        state.p2Score++;
      }
      endRound();
    } else {
      guessInput.placeholder = `Wrong! New clue unlocked. Try again:`;
    }
  }
  updateScoreboard();
}

// ==========================================
// REVEAL & CONFETTI CELEBRATION
// ==========================================
function endRound() {
  revealImg.src = state.currentImageSrc;
  revealedTitle.innerText = state.secretTitle;

  // Check if someone reached 3 points to win the match
  if (state.p1Score >= 3 || state.p2Score >= 3) {
    const matchWinner = state.p1Score >= 3 ? state.p1Name : state.p2Name;
    resultStatus.innerText += `\n\n🏆 🌟 ${matchWinner} wins the entire match! 🌟`;
    btnNextRound.innerText = "Start New Match";

    // MASSIVE MATCH-WINNING CONFETTI EXPLOSION
    var duration = 3 * 1000;
    var end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

  } else {
    btnNextRound.innerText = "Next Round";

    // STANDARD ROUND WIN CONFETTI BURST
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  switchScreen('reveal-screen');
}

// ==========================================
// 5. NEXT ROUND / NEW MATCH RESET
// ==========================================
btnNextRound.addEventListener('click', () => {
  // If a match was won, reset scores to 0 for a fresh game
  if (state.p1Score >= 3 || state.p2Score >= 3) {
    state.p1Score = 0;
    state.p2Score = 0;
    updateScoreboard();
  }

  state.activePlayer = state.activePlayer === 1 ? 2 : 1;
  
  state.currentImageSrc = "";
  state.secretTitle = "";
  secretTitleInput.value = "";
  btnLockPuzzle.disabled = true;
  dropZone.querySelector('p').innerHTML = `📁 Drag & Drop an Image here<br>OR<br>📋 Click here and press <strong>Ctrl+V</strong> to Paste from Google!`;

  updateTurnText();
  switchScreen('upload-screen');
});
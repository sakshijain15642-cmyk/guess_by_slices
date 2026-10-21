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

// ==========================================
// AUDIO SYNTHESIZER (No external files needed!)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'correct') {
    // Ascending chime
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'wrong') {
    // Low buzzer
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'win') {
    // Victory Fanfare arpeggio
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.15, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
      o.start(now + idx * 0.12);
      o.stop(now + idx * 0.12 + 0.25);
    });
  }
}

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
  playSound('click');
  const p1 = document.getElementById('p1-name-input').value.trim();
  const p2 = document.getElementById('p2-name-input').value.trim();
  
  if (p1) state.p1Name = p1;
  if (p2) state.p2Name = p2;

  updateScoreboard();
  updateTurnText();
  switchScreen('upload-screen');
});

// ==========================================
// 2. IMAGE UPLOAD & CROSS-DEVICE PASTE SUPPORT
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

// Desktop Keyboard Paste (Ctrl+V)
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

// ==========================================
// 2. IMAGE UPLOAD & UNIVERSAL PASTE SUPPORT
// ==========================================
dropZone.addEventListener('click', () => {
  // If clicked, open file picker (great for mobile photo libraries)
  fileInput.click();
});

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

// Universal Paste Event (Works for Laptop Ctrl+V AND Mobile Long-Press -> Paste)
dropZone.addEventListener('paste', (e) => {
  e.preventDefault();
  const items = e.clipboardData || e.originalEvent.clipboardData;
  if (!items) return;

  for (let i = 0; i < items.items.length; i++) {
    if (items.items[i].type.indexOf('image') !== -1) {
      const blob = items.items[i].getAsFile();
      handleImageFile(blob);
      break;
    }
  }
});

function handleImageFile(file) {
  playSound('click');
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
  playSound('click');
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
    playSound('correct');
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
      playSound('wrong');
      const setterName = state.activePlayer === 1 ? state.p1Name : state.p2Name;
      resultStatus.innerText = `❌ Out of attempts! ${setterName} wins the round!`;
      if (state.activePlayer === 1) {
        state.p1Score++;
      } else {
        state.p2Score++;
      }
      endRound();
    } else {
      playSound('wrong');
      guessInput.placeholder = `Wrong! New clue unlocked. Try again:`;
    }
  }
  updateScoreboard();
}

// ==========================================
// 5. CONFETTI & REVEAL CELEBRATIONS
// ==========================================
function triggerConfetti() {
  const colors = ['#e67e22', '#2c3e50', '#e74c3c', '#2ecc71', '#f1c40f', '#3498db'];
  
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = (window.innerWidth / 2) + 'px';
    particle.style.top = '40%';
    particle.style.borderRadius = '50%';
    particle.style.zIndex = '9999';
    particle.style.pointerEvents = 'none';
    particle.style.transition = 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 1.2s ease-out';
    
    document.body.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 250 + 50;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance - 100;

    setTimeout(() => {
      particle.style.transform = `translate(${targetX}px, ${targetY + 200}px) rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.8 + 0.4})`;
      particle.style.opacity = '0';
    }, 20);

    setTimeout(() => particle.remove(), 1300);
  }
}

function endRound() {
  revealImg.src = state.currentImageSrc;
  revealedTitle.innerText = state.secretTitle;

  // Check if someone reached 3 points to win the match
  if (state.p1Score >= 3 || state.p2Score >= 3) {
    const matchWinner = state.p1Score >= 3 ? state.p1Name : state.p2Name;
    resultStatus.innerText += `\n\n🏆 🌟 ${matchWinner} wins the entire match! 🌟`;
    btnNextRound.innerText = "Start New Match";

    playSound('win');
    triggerConfetti();
    setTimeout(triggerConfetti, 300);
    setTimeout(triggerConfetti, 600);

  } else {
    btnNextRound.innerText = "Next Round";
    triggerConfetti();
  }

  switchScreen('reveal-screen');
}

// ==========================================
// 6. NEXT ROUND / NEW MATCH RESET
// ==========================================
btnNextRound.addEventListener('click', () => {
  playSound('click');
  
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
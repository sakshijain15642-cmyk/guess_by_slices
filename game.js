// ==========================================
// GUESS FROM THE SLICES: 4-FRAGMENT EDITION (GAME.JS)
// ==========================================

// Game State Management
const state = {
  round: 1,
  maxRounds: 3,
  scores: { p1: 0, p2: 0 },
  currentPicker: 1, // Player 1 starts as the creator
  currentGuesser: 2, // Player 2 starts as the guesser
  currentImageSrc: null,
  currentAnswer: "",
  attemptsLeft: 3
};

// ==========================================
// ROBUST CLIPBOARD PASTE SUPPORT
// ==========================================
dropZone.addEventListener('paste', (e) => {
  e.preventDefault();
  const items = e.clipboardData.items;
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      
      reader.onload = (event) => {
        state.currentImageSrc = event.target.result;
        btnSubmitPuzzle.disabled = false;
        dropZone.querySelector('p').innerHTML = `✅ Image Pasted Successfully!`;
      };
      
      reader.readAsDataURL(blob);
      break;
    }
  }
});
// DOM Elements
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const answerInput = document.getElementById('answer-input');
const btnSubmitPuzzle = document.getElementById('btn-submit-puzzle');
const fragmentBoard = document.getElementById('fragment-board');

// 1. FILE UPLOAD & HANDLING
dropZone.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    state.currentImageSrc = event.target.result;
    btnSubmitPuzzle.disabled = false;
    dropZone.querySelector('p').innerHTML = `✅ Image Loaded Successfully!<br><strong>${file.name}</strong>`;
  };
  reader.readAsDataURL(file);
});

// Drag & Drop visual feedback
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.style.background = '#faf8f5'; });
});
['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.style.background = 'transparent'; });
});
dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) {
    imageInput.files = e.dataTransfer.files;
    const event = new Event('change');
    imageInput.dispatchEvent(event);
  }
});


// 2. GENERATE 4 IMAGE FRAGMENTS (Quadrants)
function generateFragments(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgSrc;
    img.onload = () => {
      const canvas = document.getElementById('offscreen-canvas');
      const ctx = canvas.getContext('2d');

      // Normalize source image to a square working size (300x300px)
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const half = size / 2; // 150px per quadrant
      
      // Define crop coordinates for the 4 quadrants
      const coordinates = [
        { x: 0, y: 0 },       // Top-Left
        { x: half, y: 0 },   // Top-Right
        { x: 0, y: half },   // Bottom-Left
        { x: half, y: half } // Bottom-Right
      ];

      const fragmentDataUrls = coordinates.map(coord => {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = 140;
        tileCanvas.height = 140;
        const tileCtx = tileCanvas.getContext('2d');

        // Draw cropped quadrant onto the tile canvas
        tileCtx.drawImage(
          canvas, 
          coord.x, coord.y, half, half, // Source crop area
          0, 0, 140, 140                // Destination size
        );

        return tileCanvas.toDataURL();
      });

      resolve(fragmentDataUrls);
    };
  });
}


// 3. PUZZLE SUBMISSION & SWITCHING TO GUESS SCREEN
btnSubmitPuzzle.addEventListener('click', async () => {
  state.currentAnswer = answerInput.value.trim().toLowerCase();
  if (!state.currentAnswer || !state.currentImageSrc) return;

  // Generate 4 fragments from the uploaded image
  const fragments = await generateFragments(state.currentImageSrc);
  
  fragmentBoard.innerHTML = '';
  
  // Render Fragment Tiles into the grid
  fragments.forEach(dataUrl => {
    const tile = document.createElement('div');
    tile.className = 'fragment-tile';
    tile.style.backgroundImage = `url(${dataUrl})`;
    fragmentBoard.appendChild(tile);
  });

  // Switch to Guesser View
  switchScreen('screen-guess');
  state.attemptsLeft = 3;
  document.getElementById('guesser-turn-label').innerText = `Player ${state.currentGuesser}: Guess the Title!`;
  document.getElementById('attempts-left').innerHTML = `Attempts left: <strong>${state.attemptsLeft}</strong>`;
  document.getElementById('guess-input').value = '';
});


// 4. GUESS VALIDATION (Fuzzy String Matching)
document.getElementById('btn-submit-guess').addEventListener('click', checkGuess);
document.getElementById('guess-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') checkGuess();
});

function checkGuess() {
  const userGuess = document.getElementById('guess-input').value.trim().toLowerCase();
  if (!userGuess) return;
  
  // Flexible check: matches if guess is included in the stored title
  const isCorrect = userGuess.length > 1 && state.currentAnswer.includes(userGuess);

  if (isCorrect) {
    state.scores[`p${state.currentGuesser}`] += 10;
    showResult(true);
  } else {
    state.attemptsLeft--;
    if (state.attemptsLeft <= 0) {
      showResult(false);
    } else {
      document.getElementById('attempts-left').innerHTML = `Wrong guess! Attempts left: <strong>${state.attemptsLeft}</strong>`;
      document.getElementById('guess-input').value = '';
    }
  }
}


// 5. RESULT SCREEN & ROUND PROGRESSION
function showResult(won) {
  switchScreen('screen-result');
  document.getElementById('score-p1').innerText = state.scores.p1;
  document.getElementById('score-p2').innerText = state.scores.p2;
  document.getElementById('revealed-image').src = state.currentImageSrc;
  document.getElementById('revealed-title').innerText = `Title: ${state.currentAnswer.toUpperCase()}`;
  
  const statusEl = document.getElementById('result-status');
  if (won) {
    statusEl.innerText = `🎉 Player ${state.currentGuesser} guessed it right!`;
  } else {
    statusEl.innerText = `❌ Out of guesses! Player ${state.currentPicker} defended their puzzle.`;
    state.scores[`p${state.currentPicker}`] += 5; // Bonus points to creator if guesser fails
  }
}

document.getElementById('btn-next-round').addEventListener('click', () => {
  // Check if match is over (Total rounds = maxRounds * 2 turns)
  if (state.round >= state.maxRounds * 2) {
    const winner = state.scores.p1 > state.scores.p2 ? "Player 1" : state.scores.p2 > state.scores.p1 ? "Player 2" : "It's a Tie!";
    alert(`🏆 MATCH OVER!\nFinal Scores -> P1: ${state.scores.p1} | P2: ${state.scores.p2}\nWinner: ${winner}`);
    location.reload();
    return;
  }
  
  state.round++;
  
  // Swap Picker and Guesser roles for the next round
  [state.currentPicker, state.currentGuesser] = [state.currentGuesser, state.currentPicker];
  
  document.getElementById('round-tracker').innerText = `Round ${Math.ceil(state.round / 2)} / ${state.maxRounds}`;
  document.getElementById('picker-turn-label').innerText = `Player ${state.currentPicker}: Pick an Image`;
  
  // Reset fields
  answerInput.value = '';
  btnSubmitPuzzle.disabled = true;
  dropZone.querySelector('p').innerHTML = `📁 Drag & Drop Movie Poster or Album Cover<br>or <strong>Click to Browse</strong>`;
  state.currentImageSrc = null;
  
  switchScreen('screen-picker');
});

// Helper Function to Toggle Screens
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

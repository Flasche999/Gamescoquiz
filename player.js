const socket = io("https://gamescoquiz.onrender.com", { transports: ["websocket"] });

const nameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code-input');
const avatarSelect = document.getElementById('avatar-select');
const joinBtn = document.getElementById('join-btn');

const joinArea = document.getElementById('join-area');
const gameArea = document.getElementById('game-area');
const displayName = document.getElementById('player-display-name');
const displayAvatar = document.getElementById('player-avatar');
const playerPoints = document.getElementById('player-points');
const questionText = document.getElementById('question-text');
const questionMeta = document.getElementById('question-meta');
const questionCounter = document.getElementById('question-counter');
const buzzerBtn = document.getElementById('buzzer-btn');
const playersOverview = document.getElementById('players-overview');

const estimateArea = document.getElementById('estimate-area');
const estimateInput = document.getElementById('estimate-input');
const estimateSubmitBtn = document.getElementById('estimate-submit-btn');
const estimateFeedback = document.getElementById('estimate-feedback');

const answerButtons = {
  A: document.getElementById('answer-a'),
  B: document.getElementById('answer-b'),
  C: document.getElementById('answer-c'),
  D: document.getElementById('answer-d')
};

let myId = null;
let hasBuzzed = false;
let activeBuzzPlayerId = null;
let currentOptions = {};

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const avatar = avatarSelect.value;
  const roomCode = roomCodeInput.value.trim();

  if (name && avatar && roomCode) {
    joinArea.style.display = 'none';
    gameArea.style.display = 'block';
    displayName.textContent = name;
    displayAvatar.textContent = avatar;
    socket.emit('registerPlayer', { name, avatar, roomCode });
  } else {
    alert('Bitte alle Felder ausfüllen!');
  }
});

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('question', (data) => {
  questionText.textContent = data.question;

  if (data.category && data.number && data.total) {
    questionMeta.textContent = `Kategorie: ${data.category}`;
    questionCounter.textContent = `Frage ${data.number} / ${data.total}`;
  } else {
    questionMeta.textContent = '';
    questionCounter.textContent = '';
  }

  currentOptions = data.options || {};

  Object.entries(answerButtons).forEach(([key, btn]) => {
    btn.innerHTML = key + ': 🔒';
    btn.disabled = true;
    btn.classList.remove('selected-answer', 'other-answer', 'unlocked');
    btn.classList.add('locked');
  });

  estimateInput.disabled = false;
  estimateSubmitBtn.disabled = false;
  estimateInput.value = '';
  if (estimateFeedback) estimateFeedback.style.display = 'none';

  hasBuzzed = false;
  activeBuzzPlayerId = null;
  buzzerBtn.disabled = false;

  document.querySelectorAll('.player-answer').forEach(el => el.remove());
  updateBuzzState();
});

estimateSubmitBtn.addEventListener('click', () => {
  const value = estimateInput.value.trim();
  if (value) {
    socket.emit('submitEstimate', { playerId: myId, value });
    estimateInput.value = '';
    estimateInput.disabled = true;
    estimateSubmitBtn.disabled = true;

    if (estimateFeedback) {
      estimateFeedback.style.display = 'block';
      setTimeout(() => {
        estimateFeedback.style.display = 'none';
      }, 3000);
    }
  }
});

socket.on('unlockEstimate', () => {
  estimateInput.disabled = false;
  estimateSubmitBtn.disabled = false;
  estimateInput.value = '';
});

socket.on('updatePlayers', (players) => {
  const me = players.find(p => p.id === socket.id);
  if (me) {
    playerPoints.textContent = `Punkte: ${me.points}`;
  }

  playersOverview.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'player-entry';
    div.setAttribute('data-id', p.id);
    div.innerHTML = `
      <div class="smiley-avatar">${p.avatar}</div>
      <div class="player-name">${p.name}</div>
      <div class="player-score">Punkte: ${p.points}</div>
    `;
    playersOverview.appendChild(div);
  });

  updateBuzzState();
});

buzzerBtn.addEventListener('click', () => {
  if (!hasBuzzed) {
    socket.emit('buzz');
    hasBuzzed = true;
    buzzerBtn.disabled = true;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !hasBuzzed && !buzzerBtn.disabled) {
    buzzerBtn.click();
  }
});

socket.on('playerBuzzed', (player) => {
  activeBuzzPlayerId = player.id;
  buzzerBtn.disabled = true;

  const buzzSound = document.getElementById('buzzer-sound');
  if (buzzSound) {
    buzzSound.currentTime = 0;
    buzzSound.play().catch(err => console.warn("Buzz-Sound konnte nicht abgespielt werden:", err));
  }

  Object.entries(answerButtons).forEach(([key, btn]) => {
    btn.disabled = myId !== player.id;
    btn.onclick = () => {
      if (myId === player.id) {
        socket.emit('submitAnswer', { playerId: myId, answer: key });
        Object.values(answerButtons).forEach(b => b.classList.remove('selected-answer', 'other-answer'));
        btn.classList.add('selected-answer');
        Object.values(answerButtons).forEach(b => b.disabled = true);
      }
    };
  });

  updateBuzzState();
});

socket.on('resetBuzzer', () => {
  hasBuzzed = false;
  activeBuzzPlayerId = null;
  buzzerBtn.disabled = false;
  Object.values(answerButtons).forEach(b => b.disabled = true);
  updateBuzzState();
});

socket.on('playerAnswer', ({ playerId, answer }) => {
  const entry = document.querySelector(`.player-entry[data-id='${playerId}']`);
  if (entry) {
    const existing = entry.querySelector('.player-answer');
    if (existing) existing.remove();

    const p = document.createElement('div');
    p.className = 'player-answer';
    p.style.fontWeight = 'bold';
    p.style.color = '#00ff88';
    p.textContent = `Antwort: ${answer}`;
    entry.appendChild(p);
  }
});

socket.on('clearAnswerHighlight', () => {
  Object.values(answerButtons).forEach(b => {
    b.classList.remove('selected-answer', 'other-answer');
  });
});

socket.on('playCorrectSound', () => {
  const sound = document.getElementById('correct-sound');
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(err => console.warn("Correct-Sound konnte nicht abgespielt werden:", err));
  }
});

socket.on('playWrongSound', () => {
  const sound = document.getElementById('wrong-sound');
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(err => console.warn("Wrong-Sound konnte nicht abgespielt werden:", err));
  }
});

document.getElementById('start-music-btn')?.addEventListener('click', () => {
  const music = document.getElementById('background-music');
  if (music) music.play().catch(err => console.warn("Musik nicht startbar:", err));
});

socket.on('playMusic', () => {
  const music = document.getElementById('background-music');
  if (music) music.play();
});

socket.on('pauseMusic', () => {
  const music = document.getElementById('background-music');
  if (music) music.pause();
});

socket.on('setVolume', (volume) => {
  const music = document.getElementById('background-music');
  if (music) music.volume = volume;
});

function updateBuzzState() {
  const entries = document.querySelectorAll('.player-entry');
  entries.forEach(entry => {
    const id = entry.getAttribute('data-id');
    if (id === activeBuzzPlayerId) {
      entry.classList.add('active-buzz');
    } else {
      entry.classList.remove('active-buzz');
    }
  });
}

// 🔓 Antwortoption freigeben
socket.on('revealSingleOption', (letter) => {
  const btn = answerButtons[letter];
  if (btn && currentOptions[letter]) {
    btn.innerHTML = `${letter}: ${currentOptions[letter]}`;
    btn.disabled = !(myId === activeBuzzPlayerId && hasBuzzed);
    btn.classList.remove('locked');
    btn.classList.add('unlocked');
  }
});

// 🏆 Gewinneranzeige animiert + Sound
socket.on('announceWinner', ({ name, points }) => {
  const box = document.createElement('div');
  box.className = 'winner-box';
  box.innerHTML = `👑 <strong>${name}</strong> hat das Spiel mit <strong>${points}</strong> Punkten gewonnen! 🎉`;
  Object.assign(box.style, {
    background: 'black',
    color: 'gold',
    padding: '15px',
    borderRadius: '12px',
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: '20px',
    animation: 'winner-blink 1s infinite'
  });
  document.body.appendChild(box);

  const winnerSound = document.getElementById('winner-sound');
  if (winnerSound) {
    winnerSound.currentTime = 0;
    winnerSound.play().catch(err => console.warn("Winner-Sound konnte nicht abgespielt werden:", err));
  }

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes winner-blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
});

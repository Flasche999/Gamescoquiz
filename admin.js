const socket = io("https://gamescoquiz.onrender.com", { transports: ["websocket"] });

const playerListEl = document.getElementById('player-list');
const buzzerInfo = document.getElementById('buzzer-info');
const currentQuestion = document.getElementById('current-question');
const correctAnswer = document.getElementById('correct-answer');
const nextQuestionBtn = document.getElementById('next-question-btn');
const roomCodeEl = document.getElementById('room-code');
const wrongQuestionsList = document.getElementById('wrong-questions-list');
const estimateList = document.getElementById('estimate-list');
const correctEstimateInput = document.getElementById('correct-estimate');
const manualDarkenBtn = document.getElementById('btn-manual-darken');
const resetMarkersBtn = document.getElementById('btn-reset-markers');


let currentBuzzer = null;
let estimates = [];

socket.on('roomCode', (code) => {
  roomCodeEl.textContent = code;
});

socket.on('updatePlayers', (players) => {
  playerListEl.innerHTML = '';
  players.forEach((player) => {
    const isBuzzed = currentBuzzer && currentBuzzer.id === player.id;
    const div = document.createElement('div');
    div.className = 'player-card' + (isBuzzed ? ' buzzed-player' : '');
    div.innerHTML = `
      <span class="avatar-smiley">${player.avatar}</span>
      <strong>${player.name}</strong> – Punkte: <span class="player-points">${player.points}</span>
      <div class="button-row">
        <button onclick="changePoints('${player.id}', 1)">+1</button>
        <button onclick="changePoints('${player.id}', -1)">-1</button>
      </div>
    `;
    playerListEl.appendChild(div);
  });
});

socket.on('revealClickPositions', (clicks) => {
  const overlay = document.createElement('div');
  overlay.id = 'click-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = 9998;

  clicks.forEach(({ x, y }) => {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.width = '20px';
    dot.style.height = '20px';
    dot.style.backgroundColor = 'red';
    dot.style.borderRadius = '50%';
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.transform = 'translate(-50%, -50%)';
    overlay.appendChild(dot);
  });

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
  }, 10000);
});

document.getElementById('btn-reveal-clicks')?.addEventListener('click', () => {
  // 👉 Marker zurücksetzen
resetMarkersBtn.addEventListener('click', () => {
  socket.emit('resetMemoryClicks');   // sagt dem Server Bescheid
});

  socket.emit('requestRevealClicks');
});

socket.on('question', (data) => {
  const categoryEl = document.getElementById('current-category');
if (categoryEl) {
  categoryEl.textContent = data.category || '–';
}

  ['a','b','c','d'].forEach(letter => {
    const container = document.getElementById(`option-${letter}-container`);
    if(container) container.style.display = 'none';
  });

  currentQuestion.textContent = data.question;
  correctAnswer.textContent = data.answer;

  document.getElementById('admin-option-a').textContent = data.options?.A || '---';
  document.getElementById('admin-option-b').textContent = data.options?.B || '---';
  document.getElementById('admin-option-c').textContent = data.options?.C || '---';
  document.getElementById('admin-option-d').textContent = data.options?.D || '---';

  buzzerInfo.innerHTML = 'Noch kein Spieler hat gebuzzert';
  document.getElementById('buzzed-answer').innerHTML = 'Ausgewählte Antwort: <strong>---</strong>';
  currentBuzzer = null;
  updatePlayers();

  if (estimateList) estimateList.innerHTML = '';
  estimates = [];
});

socket.on('showPreviewImage', ({ imageUrl }) => {
  const timerBox = document.createElement('div');
  timerBox.id = 'countdown-timer';
  timerBox.style.position = 'fixed';
  timerBox.style.top = '10px';
  timerBox.style.right = '10px';
  timerBox.style.padding = '10px 20px';
  timerBox.style.backgroundColor = 'black';
  timerBox.style.color = '#00ffff';
  timerBox.style.fontSize = '24px';
  timerBox.style.border = '2px solid #00ffff';
  timerBox.style.borderRadius = '12px';
  document.body.appendChild(timerBox);

  let secondsLeft = 20;
  timerBox.textContent = `⏳ ${secondsLeft} Sekunden`;
  const countdown = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(countdown);
      timerBox.remove();
    } else {
      timerBox.textContent = `⏳ ${secondsLeft} Sekunden`;
    }
  }, 1000);
});

if (manualDarkenBtn) {
  manualDarkenBtn.addEventListener('click', () => {
    socket.emit('darkenImageManually');
  });
}

socket.on('playerBuzzed', (player) => {
  currentBuzzer = player;
  buzzerInfo.innerHTML = `
    <strong style="color:red;">${player.name}</strong> hat gebuzzert!<br />
    <button onclick="markCorrect('${player.id}')">✅ Richtig</button>
    <button onclick="markWrong('${player.id}')">❌ Falsch</button>
  `;
  updatePlayers();

  const buzzerSound = document.getElementById('buzzer-sound');
  if (buzzerSound) {
    buzzerSound.currentTime = 0;
    buzzerSound.play().catch(err => console.warn("Buzzer konnte nicht abgespielt werden:", err));
  }
});

function changePoints(playerId, points) {
  socket.emit('changePoints', { playerId, points });
}

function markCorrect(playerId) {
  changePoints(playerId, 3);
  socket.emit('playCorrectSound');
  socket.emit('resetBuzzer');
  socket.emit('clearAnswerHighlight');
  buzzerInfo.innerHTML = '✅ Antwort war richtig';
  document.getElementById('buzzed-answer').innerHTML = 'Ausgewählte Antwort: <strong>---</strong>';
  currentBuzzer = null;
  updatePlayers();
}

function markWrong(playerId) {
  socket.emit('awardOthers', { exceptPlayerId: playerId });
  socket.emit('playWrongSound');
  socket.emit('resetBuzzer');
  socket.emit('clearAnswerHighlight');
  addWrongQuestion(currentQuestion.textContent);
  buzzerInfo.innerHTML = '❌ Antwort war falsch';
  document.getElementById('buzzed-answer').innerHTML = 'Ausgewählte Antwort: <strong>---</strong>';
  currentBuzzer = null;
  updatePlayers();
}

function addWrongQuestion(text) {
  const li = document.createElement('li');
  li.textContent = text;
  wrongQuestionsList.appendChild(li);
}

nextQuestionBtn.addEventListener('click', () => {
  socket.emit('nextQuestion');
});

function updatePlayers() {
  socket.emit('requestUpdate');
}

function playMusic() {
  socket.emit('playMusic');
}
function pauseMusic() {
  socket.emit('pauseMusic');
}
function changeVolume(volume) {
  socket.emit('setVolume', parseFloat(volume));
}

socket.on('playMusic', () => {
  const music = document.getElementById('background-music');
  if (music) music.play().catch(err => console.warn("Musik konnte nicht gestartet werden:", err));
});
socket.on('pauseMusic', () => {
  const music = document.getElementById('background-music');
  if (music) music.pause();
});
socket.on('setVolume', (volume) => {
  const music = document.getElementById('background-music');
  if (music) music.volume = volume;
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

socket.on('playerAnswer', ({ playerId, answer }) => {
  const answerEl = document.getElementById('buzzed-answer');
  if (answerEl) {
    answerEl.innerHTML = `Ausgewählte Antwort: <strong style="color:lime">${answer}</strong>`;
  }

  ['a', 'b', 'c', 'd'].forEach(letter => {
    const el = document.getElementById('admin-option-' + letter);
    if (el) el.classList.remove('selected-admin-answer');
  });

  const selected = document.getElementById('admin-option-' + answer.toLowerCase());
  if (selected) selected.classList.add('selected-admin-answer');
});

socket.on('clearAnswerHighlight', () => {
  ['a', 'b', 'c', 'd'].forEach(letter => {
    const el = document.getElementById('admin-option-' + letter);
    if (el) el.classList.remove('selected-admin-answer');
  });
  document.getElementById('buzzed-answer').innerHTML = 'Ausgewählte Antwort: <strong>---</strong>';
});

socket.on('estimateReceived', ({ playerId, name, value }) => {
  if (!estimateList) return;

  const parsedValue = parseFloat(value);
  if (isNaN(parsedValue)) return;

  const existing = estimateList.querySelector(`li[data-player-id="${playerId}"]`);
  if (existing) existing.remove();

  estimates = estimates.filter(e => e.playerId !== playerId);
  estimates.push({ playerId, name, value: parsedValue, revealed: false });

  const li = document.createElement('li');
  li.setAttribute('data-player-id', playerId);
  li.classList.add('estimate-entry');
  li.innerHTML = `
    <strong>${name}:</strong> <span class="hidden-answer">Antwort verborgen</span>
    <button onclick="revealEstimate('${playerId}')">Antwort zeigen</button>
    <button onclick="gradeEstimate('${playerId}', true)">✅</button>
    <button onclick="gradeEstimate('${playerId}', false)">❌</button>
  `;
  estimateList.appendChild(li);
});

function revealEstimate(playerId) {
  const entry = estimates.find(e => e.playerId === playerId);
  if (!entry || entry.revealed) return;

  entry.revealed = true;

  const li = estimateList.querySelector(`li[data-player-id='${playerId}']`);
  if (li) {
    const span = li.querySelector('.hidden-answer');
    if (span) {
      span.textContent = entry.value;
      span.style.color = '#00ff00';
      span.style.fontWeight = 'bold';
    }
    const btn = li.querySelector('button');
    if (btn) btn.remove();
  }
}

function gradeEstimate(playerId, isCorrect) {
  if (isCorrect) {
    changePoints(playerId, 3);
    socket.emit('playCorrectSound');
  } else {
    socket.emit('playWrongSound');
  }
}

function markClosestEstimate() {
  const correct = parseFloat(correctEstimateInput.value);
  if (isNaN(correct)) {
    alert("Bitte gültige Zahl eingeben.");
    return;
  }

  const withDiff = estimates
    .filter(e => e.revealed)
    .map(e => ({ ...e, diff: Math.abs(e.value - correct) }));

  const minDiff = Math.min(...withDiff.map(e => e.diff));
  const winners = withDiff.filter(e => e.diff === minDiff);

  document.querySelectorAll('#estimate-list li').forEach(li => {
    li.classList.remove('closest');
  });

  winners.forEach(winner => {
    const li = estimateList.querySelector(`li[data-player-id="${winner.playerId}"]`);
    if (li) li.classList.add('closest');
  });
}

function unlockEstimateInputs() {
  socket.emit('unlockEstimate');
}

function revealSingleOption(letter) {
  socket.emit('revealSingleOption', letter);
}

function revealOption(letter) {
  const container = document.getElementById(`option-${letter.toLowerCase()}-container`);
  if (container) container.style.display = 'block';
  socket.emit('revealSingleOption', letter);
}

// ✅ Memory-Bild im Admin anzeigen
socket.on('showMemoryImage', (imgUrl) => {
  const img = document.getElementById('memory-image');
  if (img) img.src = imgUrl;
});

socket.on('playerClickedOnMemoryImage', ({ playerName, x, y }) => {
  const container = document.getElementById('image-click-overlay-admin');
  const marker = document.createElement('div');
  marker.classList.add('click-marker');
  marker.style.left = `${x}%`;
  marker.style.top = `${y}%`;
  marker.title = playerName;
  container.appendChild(marker);
});

// ✅ Funktion ist außerhalb und korrekt platziert
function unlockBuzzerManually() {
  socket.emit('unlockBuzzerManually');
}
socket.on('resetBuzzer', () => {
  currentBuzzer = null;
  buzzerInfo.innerHTML = '🔓 Buzzer wurde freigegeben';
  document.getElementById('buzzed-answer').innerHTML = 'Ausgewählte Antwort: <strong>---</strong>';
  updatePlayers();
});

// 🧠 Klickmarker bei Reset entfernen
socket.on('memoryClicksReset', () => {
  // Marker im Admin-Overlay entfernen
  document
    .querySelectorAll('#image-click-overlay-admin .click-marker')
    .forEach(m => m.remove());

  // Optional: falls Marker im globalen Overlay sichtbar sind
  document
    .querySelectorAll('#image-click-overlay .click-marker')
    .forEach(m => m.remove());
});

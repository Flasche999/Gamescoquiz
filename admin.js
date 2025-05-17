const socket = io("https://gamescoquiz.onrender.com", { transports: ["websocket"] });

const playerListEl = document.getElementById('player-list');
const buzzerInfo = document.getElementById('buzzer-info');
const currentQuestion = document.getElementById('current-question');
const correctAnswer = document.getElementById('correct-answer');
const nextQuestionBtn = document.getElementById('next-question-btn');
const roomCodeEl = document.getElementById('room-code');

const categoryInput = document.getElementById('question-category');
const newQuestionInput = document.getElementById('new-question');
const newAnswerInput = document.getElementById('new-answer');
const addQuestionBtn = document.getElementById('add-question-btn');
const wrongQuestionsList = document.getElementById('wrong-questions-list');

let currentBuzzer = null;
let estimates = [];

const estimateList = document.getElementById('estimate-list');
const correctEstimateInput = document.getElementById('correct-estimate');

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

socket.on('question', (data) => {
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

addQuestionBtn.addEventListener('click', () => {
  const category = categoryInput.value.trim();
  const question = newQuestionInput.value.trim();
  const answerA = document.getElementById('answer-a').value.trim();
  const answerB = document.getElementById('answer-b').value.trim();
  const answerC = document.getElementById('answer-c').value.trim();
  const answerD = document.getElementById('answer-d').value.trim();
  const correctAnswer = newAnswerInput.value.trim().toUpperCase();

  if (category && question && answerA && answerB && answerC && answerD && correctAnswer) {
    socket.emit('addQuestion', {
      category,
      question,
      options: { A: answerA, B: answerB, C: answerC, D: answerD },
      answer: correctAnswer
    });

    categoryInput.value = '';
    newQuestionInput.value = '';
    document.getElementById('answer-a').value = '';
    document.getElementById('answer-b').value = '';
    document.getElementById('answer-c').value = '';
    document.getElementById('answer-d').value = '';
    newAnswerInput.value = '';
  } else {
    alert("Bitte alle Felder ausfüllen (inkl. Optionen A–D und richtige Antwort)");
  }
});

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

const showWinnerBtn = document.getElementById('show-winner-btn');
if (showWinnerBtn) {
  showWinnerBtn.addEventListener('click', () => {
    socket.emit('requestUpdate');
    setTimeout(() => {
      const playerCards = document.querySelectorAll('.player-card');
      let topPlayer = null;
      let topPoints = -Infinity;

      playerCards.forEach(card => {
        const name = card.querySelector('strong')?.textContent || '';
        const pointsText = card.querySelector('.player-points')?.textContent || '0';
        const points = parseInt(pointsText);

        if (!isNaN(points) && points > topPoints) {
          topPoints = points;
          topPlayer = name;
        }
      });

      if (topPlayer !== null) {
        showConfetti();

        const winnerSound = document.getElementById('winner-sound');
        if (winnerSound) {
          winnerSound.currentTime = 0;
          winnerSound.play().catch(err => console.warn("Gewinner-Sound konnte nicht abgespielt werden:", err));
        }

        document.querySelectorAll('.player-card').forEach(card => {
          const name = card.querySelector('strong')?.textContent || '';
          const avatarEl = card.querySelector('.avatar-smiley');
          if (avatarEl) {
            if (name === topPlayer) {
              avatarEl.innerHTML = '👑 ' + avatarEl.innerHTML.replace('👑', '').trim();
            } else {
              avatarEl.innerHTML = avatarEl.innerHTML.replace('👑', '').trim();
            }
          }
        });

        alert(`🎉 Der Gewinner ist: ${topPlayer} mit ${topPoints} Punkten!`);
      } else {
        alert("❗ Kein Spieler gefunden.");
      }
    }, 300);
  });
}

function showConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  container.innerHTML = '';
  const count = 150;

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'absolute';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    confetti.style.top = '-20px';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.opacity = Math.random();
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.transition = 'top 3s ease-out';
    container.appendChild(confetti);

    setTimeout(() => {
      confetti.style.top = '100%';
    }, 50);
  }

  container.style.display = 'block';
  setTimeout(() => {
    container.style.display = 'none';
    container.innerHTML = '';
  }, 3500);
}

function revealSingleOption(letter) {
  socket.emit('revealSingleOption', letter);
}

function revealOption(letter) {
  const container = document.getElementById(`option-${letter.toLowerCase()}-container`);
  if(container) container.style.display = 'block';
  socket.emit('revealSingleOption', letter);
}

// 📸 Bilderrätsel anzeigen/verstecken
const imageUrlInput = document.getElementById('image-url-input');
const sendImageBtn = document.getElementById('send-image-question-btn');
const hideImageBtn = document.getElementById('hide-image-question-btn');

if (sendImageBtn && hideImageBtn && imageUrlInput) {
  sendImageBtn.addEventListener('click', () => {
    const imageUrl = imageUrlInput.value.trim();
    if (imageUrl) {
      socket.emit('showImageQuestion', { imageUrl });
    } else {
      alert("❗ Bitte eine Bild-URL eingeben!");
    }
  });

  hideImageBtn.addEventListener('click', () => {
    socket.emit('hideImageQuestion');
  });
}

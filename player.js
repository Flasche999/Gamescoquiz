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

// 📸 Bilderrätsel-Klicksystem
const imageQuizArea = document.getElementById('image-quiz-area');
const quizImage = document.getElementById('quiz-image');

if (quizImage) {
  quizImage.addEventListener('click', function (e) {
    const rect = quizImage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const relativeX = x / quizImage.width;
    const relativeY = y / quizImage.height;

    socket.emit('imageAnswer', { x: relativeX, y: relativeY });
  });
}

socket.on('showImageQuestion', ({ imageUrl }) => {
  imageQuizArea.style.display = 'block';
  quizImage.src = imageUrl;
});

socket.on('hideImageQuestion', () => {
  imageQuizArea.style.display = 'none';
  quizImage.src = '';
});

const previewImageArea = document.getElementById('preview-image-area');
const previewImage = document.getElementById('preview-image');
const hiddenImageArea = document.getElementById('hidden-image-area');
const hiddenImage = document.getElementById('hidden-image');
const blackOverlay = document.getElementById('black-overlay');

socket.on('showPreviewImage', ({ imageUrl }) => {
  previewImage.src = imageUrl;
  previewImageArea.style.display = 'block';
  hiddenImageArea.style.display = 'none';
  imageQuizArea.style.display = 'none';
});

socket.on('showDarkenedImage', ({ imageUrl }) => {
  previewImageArea.style.display = 'none';
  hiddenImage.src = imageUrl;
  hiddenImageArea.style.display = 'block';
});

blackOverlay.addEventListener('click', function (e) {
  const rect = hiddenImage.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / hiddenImage.width).toFixed(4);
  const y = ((e.clientY - rect.top) / hiddenImage.height).toFixed(4);
  socket.emit('imageAnswer', { x: parseFloat(x), y: parseFloat(y) });
});

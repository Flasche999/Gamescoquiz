const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const QUESTIONS_FILE = path.join(__dirname, 'fragen.json');

app.use(express.static(path.join(__dirname)));

let players = [];
let questionDB = [];
let questionProgress = {};
let buzzerLocked = false;
let globalQuestionIndex = 0;
let roomCode = Math.floor(1000 + Math.random() * 9000);
let currentImageTarget = null;
let memoryClicks = new Set();
const playerClickMap = new Map();

if (fs.existsSync(QUESTIONS_FILE)) {
  try {
    const savedQuestions = fs.readFileSync(QUESTIONS_FILE);
    questionDB = JSON.parse(savedQuestions);
    console.log(`✅ ${questionDB.length} Fragen aus fragen.json geladen.`);
  } catch (err) {
    console.error('❌ Fehler beim Laden von fragen.json:', err);
  }
}

io.on('connection', (socket) => {
  console.log('🔌 Neuer Client verbunden:', socket.id);
  socket.emit('roomCode', roomCode);

  socket.on('registerPlayer', ({ name, avatar, roomCode: clientRoomCode }) => {
    if (parseInt(clientRoomCode) !== roomCode) {
      socket.emit('errorMessage', '🚫 Raumcode ist ungültig.');
      return;
    }

    const newPlayer = {
      id: socket.id,
      name,
      avatar,
      points: 0
    };
    players.push(newPlayer);
    io.emit('updatePlayers', players);
  });

  socket.on('changePoints', ({ playerId, points }) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      player.points += points;
      io.emit('updatePlayers', players);
    }
  });

  socket.on('awardOthers', ({ exceptPlayerId }) => {
    players.forEach(p => {
      if (p.id !== exceptPlayerId) {
        p.points += 1;
      }
    });
    io.emit('updatePlayers', players);
  });

  socket.on('addQuestion', ({ category, question, options, answer }) => {
    const newQ = { category, question, options, answer };
    questionDB.push(newQ);

    try {
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questionDB, null, 2));
      console.log(`➕ Frage gespeichert: ${question}`);
    } catch (err) {
      console.error('❌ Fehler beim Speichern der Frage:', err);
    }

    io.emit('questionAdded', newQ);
  });

  socket.on('nextQuestion', () => {
    if (questionDB.length > 0 && globalQuestionIndex < questionDB.length) {
      const q = questionDB[globalQuestionIndex];
      globalQuestionIndex++;

      io.emit('question', {
        ...q,
        number: globalQuestionIndex,
        total: questionDB.length,
        category: q.category || 'Allgemein'
      });

      buzzerLocked = false;
      memoryClicks.clear();
      playerClickMap.clear();

      if (q.type === 'memory' && q.imageUrl && q.solution) {
        io.emit('showPreviewImage', { imageUrl: q.imageUrl });
        io.emit('showMemoryImage', q.imageUrl); // ✅ Bild auch an Admin senden
        currentImageTarget = q.solution;
      } else if (q.type === 'image' && q.imageUrl) {
        io.emit('showImageQuestion', { imageUrl: q.imageUrl });
        currentImageTarget = q.solution || null;
      } else {
        io.emit('hideImageQuestion');
        currentImageTarget = null;
      }
    } else {
      console.log("✅ Alle Fragen wurden gestellt.");
    }
  });

  socket.on('nextQuestionByCategory', (category) => {
    const pool = questionDB.filter(q => q.category === category);
    if (!questionProgress[category]) questionProgress[category] = 0;
    if (pool.length > 0 && questionProgress[category] < pool.length) {
      const q = pool[questionProgress[category]];
      questionProgress[category]++;
      io.emit('question', {
        ...q,
        category,
        number: questionProgress[category],
        total: pool.length
      });
      buzzerLocked = false;
    }
  });

  socket.on('buzz', () => {
    if (!buzzerLocked) {
      buzzerLocked = true;
      const player = players.find(p => p.id === socket.id);
      if (player) {
        io.emit('playerBuzzed', player);
      }
    }
  });

  socket.on('clearAnswerHighlight', () => {
    io.emit('clearAnswerHighlight');
  });

  socket.on('resetBuzzer', () => {
    buzzerLocked = false;
    io.emit('resetBuzzer');
  });

  socket.on('requestUpdate', () => {
    io.emit('updatePlayers', players);
  });

  socket.on('submitAnswer', ({ playerId, answer }) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      io.emit('playerAnswer', {
        playerId,
        name: player.name,
        avatar: player.avatar,
        answer
      });
    }
  });

  socket.on('submitEstimate', ({ playerId, value }) => {
    const player = players.find(p => p.id === playerId);
    const numericValue = parseFloat(value);

    if (player && !isNaN(numericValue)) {
      console.log(`📨 Schätzantwort von ${player.name}: ${numericValue}`);
      io.emit('estimateReceived', { playerId, name: player.name, value: numericValue });
    } else {
      console.warn(`❌ Ungültige Schätzantwort von ${player?.name || playerId}:`, value);
    }
  });

  socket.on('unlockEstimate', () => {
    io.emit('unlockEstimate');
  });

  socket.on('revealSingleOption', (letter) => {
    io.emit('revealSingleOption', letter);
  });

  socket.on('requestImageReveal', ({ imageUrl }) => {
    socket.emit('showPreviewImage', { imageUrl });
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit('updatePlayers', players);
    console.log('❌ Client getrennt:', socket.id);
  });

  socket.on('playCorrectSound', () => io.emit('playCorrectSound'));
  socket.on('playWrongSound', () => io.emit('playWrongSound'));
  socket.on('playMusic', () => io.emit('playMusic'));
  socket.on('pauseMusic', () => io.emit('pauseMusic'));
  socket.on('setVolume', (volume) => io.emit('setVolume', volume));

  socket.on('showImageQuestion', ({ imageUrl }) => {
    io.emit('showImageQuestion', { imageUrl });
  });

  socket.on('hideImageQuestion', () => {
    io.emit('hideImageQuestion');
  });

  socket.on('showPreviewImage', ({ imageUrl }) => {
    io.emit('showPreviewImage', { imageUrl });
  });

  socket.on('showDarkenedImage', ({ imageUrl }) => {
    io.emit('showDarkenedImage', { imageUrl });
  });

  socket.on('darkenImageManually', () => {
    if (questionDB[globalQuestionIndex - 1]?.imageUrl) {
      io.emit('showDarkenedImage', { imageUrl: questionDB[globalQuestionIndex - 1].imageUrl });
      currentImageTarget = questionDB[globalQuestionIndex - 1].solution || null;
    }
  });

  socket.on('imageAnswer', ({ x, y }) => {
    if (memoryClicks.has(socket.id)) {
      console.log(`🚫 Spieler ${socket.id} hat bereits geklickt.`);
      return;
    }
    memoryClicks.add(socket.id);

    const player = players.find(p => p.id === socket.id);
    if (player && currentImageTarget) {
      console.log(`🖼️ ${player.name} klickte bei X: ${(x * 100).toFixed(1)}%, Y: ${(y * 100).toFixed(1)}%`);
      const { x: tx, y: ty, tolerance } = currentImageTarget;
      const isCorrect = Math.abs(x - tx) <= tolerance && Math.abs(y - ty) <= tolerance;
      playerClickMap.set(player.id, { x, y, name: player.name });

      // ✅ Klick auch an Admin-Panel senden
      io.emit('playerClickedOnMemoryImage', { playerName: player.name, x: x * 100, y: y * 100 });

      if (isCorrect) {
        player.points += 3;
        socket.emit('playCorrectSound');
      } else {
        socket.emit('playWrongSound');
      }
      io.emit('updatePlayers', players);
    }
  });

  socket.on('requestRevealClicks', () => {
    const allClicks = Array.from(playerClickMap.values());
    io.emit('revealClicksToAll', allClicks);
  });

  // ✅ Bild manuell anzeigen (optional extern triggert)
  socket.on('showMemoryImage', ({ imageUrl }) => {
    io.emit('showMemoryImage', imageUrl);
  });

  // ✅ Klickposition direkt übertragen (optional extern triggert)
  socket.on('imageClick', ({ playerId, name, x, y }) => {
    io.emit('playerClickedOnMemoryImage', { playerName: name, x: x * 100, y: y * 100 });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});

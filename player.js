<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Spieler</title>
  <link rel="stylesheet" href="style.css" />
  <script defer src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <script defer src="player.js"></script>
</head>
<body>
  <div class="player-container">
    <h1>Willkommen bei der GamesCO Quizshow</h1>

    <!-- Beitrittsformular -->
    <div id="join-area">
      <input type="text" id="player-name" placeholder="Dein Name" /><br/>
      <input type="text" id="room-code-input" placeholder="Raumcode" /><br/>
      <select id="avatar-select">
        <option value="😀">😀</option>
        <option value="😎">😎</option>
        <option value="🤖">🤖</option>
        <option value="👾">👾</option>
        <option value="😺">😺</option>
      </select><br/>
      <button id="join-btn">Beitreten</button>
    </div>

    <!-- Spielanzeige -->
    <div id="game-area" style="display: none;">
      <h2 id="player-display-name"></h2>
      <div id="player-avatar" class="avatar-smiley"></div>
      <p id="player-points">Punkte: 0</p>

      <h3 id="question-text">Warte auf Frage ...</h3>
      <div id="question-meta"></div>
      <p id="question-counter" style="color:#00ffff; font-weight:bold; margin-bottom:10px;"></p>

      <button id="buzzer-btn">BUZZ!</button>

      <!-- Antwortmöglichkeiten -->
      <div class="answer-buttons">
        <button class="answer-button" id="answer-a" disabled>A: 🔒</button>
        <button class="answer-button" id="answer-b" disabled>B: 🔒</button>
        <button class="answer-button" id="answer-c" disabled>C: 🔒</button>
        <button class="answer-button" id="answer-d" disabled>D: 🔒</button>
      </div>

      <!-- Eingabefeld für Schätzfragen -->
      <div id="estimate-area" style="margin-top: 20px;">
        <input type="text" id="estimate-input" placeholder="Deine Schätzung eingeben" />
        <button id="estimate-submit-btn">Antwort abschicken</button>
        <p id="estimate-feedback" style="display:none; color:#00ff88; font-weight:bold; margin-top:10px;">
          ✅ Deine Schätzung wurde gespeichert!
        </p>
      </div>

      <!-- Spielerübersicht -->
      <div id="all-players-view">
        <h3>Alle Spieler:</h3>
        <div id="players-overview"></div>
      </div>

      <!-- Musikstart-Button -->
      <button id="start-music-btn">🎵 Musik starten</button>

      <!-- Gewinneranzeige -->
      <div id="winner-box" style="display:none; font-size: 1.5em; margin-top: 20px; color: gold; text-align: center;"></div>
      <audio id="winner-sound" src="sounds/winner.mp3"></audio>

      <!-- Bilderrätsel-Bereich -->
      <div id="image-quiz-area" style="display: none; margin-top: 20px; text-align: center;">
        <p style="font-weight: bold; color: #00ffff;">Klicke auf die richtige Stelle im Bild!</p>
        <img id="quiz-image" src="" alt="Bilderrätsel" style="max-width: 100%; border: 2px solid white; cursor: crosshair;" />
      </div>

      <!-- Memory-Bilderrätsel: Vorschau-Bild -->
      <div id="preview-image-area" style="display: none; margin-top: 20px; text-align: center;">
        <p style="color: #00ffff;">Merke dir den Ort des Objekts!</p>
        <p id="memory-timer" style="font-size: 18px; color: yellow; font-weight: bold;"></p>
        <img id="preview-image" src="" style="max-width: 100%; border: 2px solid lime;" />
      </div>

      <!-- Memory-Bilderrätsel: Schwarzes Bild mit Overlay + Click-Catcher -->
      <div id="hidden-image-area" style="display: none; position: relative; margin-top: 20px; text-align: center;">
        <div style="position: relative; display: inline-block;">
          <img id="hidden-image" src="" style="max-width: 100%;" />
          <div id="black-overlay"
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
               background: rgba(0, 0, 0, 1); pointer-events: none;
               z-index: 10; mask-image: none; -webkit-mask-image: none;">
          </div>
          <div id="click-catcher"
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
               z-index: 11; cursor: crosshair;">
          </div>
        </div>
      </div>
    </div>

    <!-- Sounds -->
    <audio id="background-music" src="audio/background.mp3" loop></audio>
    <audio id="buzzer-sound" src="sounds/buzzer.mp3"></audio>
    <audio id="correct-sound" src="sounds/correct.mp3"></audio>
    <audio id="wrong-sound" src="sounds/wrong.mp3"></audio>
  </div>
</body>
</html>

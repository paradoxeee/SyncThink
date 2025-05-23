// game.js - Gestion de l'UI uniquement
import socketHandler from './socket-handler.js';

document.addEventListener('DOMContentLoaded', () => {
  // Éléments DOM
  const roomIdElement = document.getElementById('room-id');
  const questionDisplay = document.getElementById('question-display');
  const answerInput = document.getElementById('answer-input');
  const submitButton = document.getElementById('submit-btn');
  const playersDisplay = document.getElementById('players-display');
  const resultsDisplay = document.getElementById('results-display');
  const gameState = document.getElementById('game-state');
  const timerElement = document.getElementById('timer');
  const copyButton = document.getElementById('copy-btn');

  // Récupération des paramètres d'URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId')?.toUpperCase();
  const playerId = urlParams.get('playerId');

  // Initialisation
  initUI();
  initSocket();

  // Fonctions UI
  function initUI() {
    if (!gameId || !playerId) {
      showToast('Paramètres de jeu manquants', 'error');
      setTimeout(() => window.location.href = '/', 3000);
      return;
    }

    if (roomIdElement) roomIdElement.textContent = gameId;
    
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(gameId);
        showToast('ID copié !');
      });
    }

    if (submitButton) {
      submitButton.addEventListener('click', handleAnswerSubmit);
    }
  }

  function initSocket() {
    socketHandler.init(gameId, playerId);
  }

  function handleAnswerSubmit(e) {
    e.preventDefault();
    
    if (!answerInput) return;
    
    const answer = answerInput.value.trim();
    if (!answer) {
      showToast('Veuillez entrer une réponse', 'warning');
      return;
    }

    // Désactiver l'input et le bouton
    disableAnswerInput();
    
    // Envoyer la réponse via le gestionnaire de socket
    socketHandler.submitAnswer(answer);
  }

  function disableAnswerInput() {
    if (answerInput) answerInput.disabled = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'ENVOYÉ ✓';
    }
  }

  function enableAnswerInput() {
    if (answerInput) {
      answerInput.value = '';
      answerInput.disabled = false;
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'SOUMETTRE';
    }
  }

  function updatePlayersUI(players) {
    if (!playersDisplay) return;
    
    playersDisplay.innerHTML = players.map(player => `
      <div class="player-card ${player.id === playerId ? 'current-player' : ''}">
        <div class="player-name">
          ${player.username} ${player.id === playerId ? '(Vous)' : ''}
        </div>
        <div class="player-score">${player.score || 0} pts</div>
      </div>
    `).join('');
  }

  function showRoundResults(data) {
    if (!resultsDisplay) return;
    
    resultsDisplay.innerHTML = `
      <div class="results-content">
        <h3 class="${data.match ? 'success' : 'fail'}">
          ${data.match ? '🎉 SYNCHRONISATION !' : '❌ Pas de match...'}
        </h3>
        <div class="answers-list">
          ${Object.entries(data.answers).map(([id, answer]) => `
            <div class="answer-item ${id === playerId ? 'your-answer' : ''}">
              <strong>${getPlayerName(id)}:</strong> "${answer || 'Pas de réponse'}"
            </div>
          `).join('')}
        </div>
        <div class="scores-update">
          ${Object.entries(data.scores).map(([id, score]) => `
            <div class="score-item ${id === playerId ? 'your-score' : ''}">
              ${getPlayerName(id)}: ${score} pts
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function updateTimer(timeLeft) {
    if (timerElement) {
      timerElement.textContent = `${timeLeft}s`;
      if (timeLeft <= 10) {
        timerElement.classList.add('warning');
      } else {
        timerElement.classList.remove('warning');
      }
    }
  }

  function showQuestion(question, round, maxRounds) {
    if (questionDisplay) {
      questionDisplay.classList.remove('hidden');
      const roundInfo = questionDisplay.querySelector('.round-info');
      if (roundInfo) {
        roundInfo.innerHTML = `Round <span id="round-number">${round}</span>/<span id="max-rounds">${maxRounds}</span>`;
      }
      const questionElement = questionDisplay.querySelector('#current-question');
      if (questionElement) {
        questionElement.textContent = question;
      }
    }
    enableAnswerInput();
  }

  function showGameState(state) {
    if (!gameState) return;
    
    switch (state) {
      case 'waiting':
        gameState.innerHTML = `
          <div id="waiting-message">
            <p>En attente d'un deuxième joueur...</p>
            <div class="loading-spinner" role="status" aria-label="Chargement"></div>
          </div>
        `;
        break;
      case 'playing':
        gameState.innerHTML = '';
        break;
      case 'finished':
        gameState.innerHTML = `
          <div class="game-over">
            <h2>Partie terminée !</h2>
          </div>
        `;
        break;
    }
  }

  // Helpers UI
  function getPlayerName(id) {
    const players = window.gameState?.players || [];
    const player = players.find(p => p.id === id);
    return player ? player.username : `Joueur ${id.slice(0, 4)}`;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  // Nettoyage lors de la fermeture de la page
  window.addEventListener('beforeunload', () => {
    socketHandler.cleanup();
  });

  // Exposer les fonctions UI pour le backend
  window.gameUI = {
    updatePlayersUI,
    showRoundResults,
    updateTimer,
    showQuestion,
    showGameState,
    showToast
  };

  // Styles
  const styles = `
    .results-content {
      text-align: center;
      padding: 20px;
    }
    .results-content h3 {
      font-size: 24px;
      margin-bottom: 20px;
    }
    .results-content h3.success {
      color: #4CAF50;
    }
    .results-content h3.fail {
      color: #f44336;
    }
    .answers-list {
      margin: 20px 0;
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }
    .answer-item {
      margin: 10px 0;
      padding: 8px;
      border-radius: 4px;
    }
    .answer-item.your-answer {
      background: rgba(76, 175, 80, 0.2);
    }
    .scores-update {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    .score-item {
      margin: 5px 0;
      font-size: 18px;
    }
    .score-item.your-score {
      color: #4CAF50;
      font-weight: bold;
    }
  `;
});
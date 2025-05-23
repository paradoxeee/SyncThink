// game.js - Gestion principale du jeu SyncThink (version corrigée)
import config from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Éléments DOM
  const roomIdElement = document.getElementById('room-id');
  const shareIdElement = document.getElementById('share-id');
  const questionDisplay = document.getElementById('question-display');
  const currentQuestionElement = document.getElementById('current-question');
  const answerInput = document.getElementById('answer-input');
  const submitButton = document.getElementById('submit-btn');
  const playersDisplay = document.getElementById('players-display');
  const resultsDisplay = document.getElementById('results-display');
  const gameState = document.getElementById('game-state');
  const waitingMessage = document.getElementById('waiting-message');
  const timerElement = document.getElementById('timer');
  const copyButton = document.getElementById('copy-btn');
  const roundNumberElement = document.getElementById('round-number');
  const maxRoundsElement = document.getElementById('max-rounds');

  // Variables d'état
  let currentPlayers = [];
  let gameStatus = 'waiting';
  let hasSubmittedAnswer = false;
  let roundTimer;
  let serverTimeLeft = 30;
  let socket;

  // Récupération des paramètres d'URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId')?.toUpperCase();
  const playerId = urlParams.get('playerId');

  // Validation des paramètres
  if (!gameId || !playerId) {
    showError('Paramètres manquants dans l\'URL');
    setTimeout(() => window.location.href = '/', 3000);
    return;
  }

  // Initialisation de l'interface
  initInterface();
  connectToGame();

  function updateTimerDisplay() {
    if (!timerElement) return;
    timerElement.textContent = `${serverTimeLeft}s`;
    timerElement.className = serverTimeLeft <= 10 ? 'warning' : '';
  }

  function startLocalTimer() {
    clearInterval(roundTimer);
    roundTimer = setInterval(() => {
      serverTimeLeft--;
      updateTimerDisplay();
      
      if (serverTimeLeft <= 0) {
        clearInterval(roundTimer);
        forceSubmitAnswer();
      }
    }, 1000);
  }

  function forceSubmitAnswer() {
    if (hasSubmittedAnswer) return;
    
    const answer = answerInput?.value?.trim() || "[Aucune réponse]";
    socket.emit('submitAnswer', { 
      gameId, 
      playerId, 
      answer,
      timeLeft: 0 
    });
    
    hasSubmittedAnswer = true;
    disableAnswerInterface();
  }

  function setupSocketListeners() {
    socket.on('gameUpdate', (data) => {
      currentPlayers = data.players || [];
      gameStatus = data.status || 'waiting';
      
      updatePlayersDisplay();
      updateGameStatus(data);
      
      if (currentPlayers.length === 2 && gameStatus === 'waiting') {
        showToast('Tous les joueurs sont connectés !');
      }

      if (data.scores) {
        updateScores(data.scores);
      }
    });

    socket.on('newRound', (data) => {
      resetRoundState();
      serverTimeLeft = data.timeLeft;
      
      // Mettre à jour les informations du round
      if (roundNumberElement) roundNumberElement.textContent = data.round;
      if (maxRoundsElement) maxRoundsElement.textContent = data.maxRounds;
      
      // Afficher la nouvelle question
      if (currentQuestionElement) {
        currentQuestionElement.innerHTML = `
          <div class="round-info">Round ${data.round}/${data.maxRounds}</div>
          <div class="question-text">${data.question}</div>
        `;
      }

      // Afficher les éléments appropriés
      questionDisplay.classList.remove('hidden');
      resultsDisplay.classList.add('hidden');
      waitingMessage.classList.add('hidden');
      
      // Réinitialiser le champ de réponse
      if (answerInput) {
        answerInput.value = '';
        answerInput.disabled = false;
        answerInput.focus();
      }
      
      // Démarrer le timer
      startLocalTimer();
    });

    socket.on('roundResults', (data) => {
      clearInterval(roundTimer);
      updateScores(data.scores);
      showRoundResults(data);
      
      // Cacher la question et afficher les résultats
      questionDisplay.classList.add('hidden');
      resultsDisplay.classList.remove('hidden');
    });

    socket.on('timerUpdate', (data) => {
      serverTimeLeft = data.timeLeft;
      updateTimerDisplay();
    });

    socket.on('gameOver', (data) => {
      endGame(data);
    });
  }

  function getPlayerName(playerId) {
    return currentPlayers.find(p => p.id === playerId)?.username || `Joueur ${playerId.slice(0, 4)}`;
  }

  function submitAnswer(e) {
    e.preventDefault();
    
    if (hasSubmittedAnswer) return;
    
    const answer = answerInput?.value?.trim();
    if (!answer) {
      showToast('Veuillez entrer une réponse', 'warning');
      return;
    }
    
    clearInterval(roundTimer);
    socket.emit('submitAnswer', { 
      gameId, 
      playerId, 
      answer,
      timeLeft: serverTimeLeft 
    });
    
    hasSubmittedAnswer = true;
    disableAnswerInterface();
    showToast('Réponse envoyée !', 'success');
  }

  function disableAnswerInterface() {
    if (answerInput) answerInput.disabled = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'ENVOYÉ ✓';
    }
  }

  function resetRoundState() {
    hasSubmittedAnswer = false;
    clearInterval(roundTimer);
    
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'SOUMETTRE';
    }
  }

  function updateScores(scores) {
    currentPlayers.forEach(player => {
      if (scores[player.id] !== undefined) {
        player.score = scores[player.id];
      }
    });
    updatePlayersDisplay();
  }

  function showRoundResults(data) {
    const matchMessage = data.match ? 
      '🎉 SYNCHRONISATION RÉUSSIE ! (+10 points)' : 
      '❌ Pas de match cette fois...';
    
    const answersHtml = Object.entries(data.answers)
      .map(([id, answer]) => {
        const player = currentPlayers.find(p => p.id === id);
        const isCurrent = id === playerId;
        return `
          <div class="answer-item ${isCurrent ? 'your-answer' : ''}">
            <strong>${player?.username || 'Joueur'}:</strong> 
            <span>"${answer}"</span>
          </div>
        `;
      }).join('');
    
    resultsDisplay.innerHTML = `
      <div class="results-content">
        <h3 class="match-result ${data.match ? 'success' : 'fail'}">${matchMessage}</h3>
        <div class="answers-section">
          <h4>Réponses:</h4>
          ${answersHtml}
        </div>
        ${!data.isGameOver ? 
          '<p class="next-round">Prochain round dans 5 secondes...</p>' : 
          ''
        }
      </div>
    `;
  }

  function endGame(data) {
    gameStatus = 'finished';
    clearInterval(roundTimer);
    
    const winner = currentPlayers.find(p => p.id === data.winner);
    const isWinner = playerId === data.winner;
    
    resultsDisplay.innerHTML = `
      <div class="game-over-content">
        <h2 class="game-over-title">🎉 PARTIE TERMINÉE !</h2>
        <div class="winner-announcement ${isWinner ? 'you-won' : ''}">
          <h3>Gagnant: ${winner?.username || 'Inconnu'} 🏆</h3>
          ${isWinner ? '<p>Félicitations !</p>' : ''}
        </div>
        <div class="final-scores">
          ${data.finalScores.map(([id, score], index) => {
            const player = currentPlayers.find(p => p.id === id);
            const isCurrent = id === playerId;
            return `
              <div class="final-score ${isCurrent ? 'your-score' : ''}">
                ${index === 0 ? '🏆 ' : ''}
                ${player?.username || 'Joueur'}: ${score} pts
              </div>
            `;
          }).join('')}
        </div>
        <div class="game-over-actions">
          <button onclick="location.href='/'" class="button button-home">
            Accueil
          </button>
          <button onclick="location.reload()" class="button button-replay">
            Rejouer
          </button>
        </div>
      </div>
    `;
  }

  function updatePlayersDisplay() {
    if (!playersDisplay) return;
    
    playersDisplay.innerHTML = currentPlayers.map(player => {
      const isCurrent = player.id === playerId;
      const statusClass = player.ready ? 'ready' : '';
      const connectionClass = player.connected ? '' : 'disconnected';
      
      return `
        <div class="player-card ${statusClass} ${connectionClass} ${isCurrent ? 'current-player' : ''}">
          <div class="player-name">
            ${player.username} ${isCurrent ? '(Vous)' : ''}
          </div>
          <div class="player-score">${player.score || 0} pts</div>
          <div class="player-status">
            ${!player.connected ? '🔌 Déconnecté' : 
              player.ready ? '✓ Prêt' : '⏳ En attente'}
          </div>
        </div>
      `;
    }).join('');
  }

  function updateGameStatus(data) {
    if (!gameState) return;
    
    if (data.status === 'waiting' && currentPlayers.length < 2) {
      gameState.innerHTML = `
        <div class="waiting-state">
          <p>En attente d'un deuxième joueur...</p>
          <div class="loading-spinner"></div>
          <p>Code: <strong>${gameId}</strong></p>
        </div>
      `;
    } else if (data.status === 'playing') {
      gameState.innerHTML = `
        <div class="game-info">
          <p>Round ${data.round}/${data.maxRounds}</p>
        </div>
      `;
    }
  }

  // Fonctions utilitaires
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }, 10);
  }

  function showError(message) {
    showToast(message, 'error');
  }

  // Gestion de la déconnexion
  window.addEventListener('beforeunload', () => {
    if (socket) socket.disconnect();
  });

  function initInterface() {
    if (roomIdElement) roomIdElement.textContent = gameId;
    if (shareIdElement) shareIdElement.textContent = gameId;
    
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(gameId);
        showToast('ID copié !');
      });
    }

    const answerForm = document.getElementById('answer-form');
    if (answerForm) {
      answerForm.addEventListener('submit', submitAnswer);
    }
  }

  function connectToGame() {
    socket = io(config.backendUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Connecté au serveur');
      socket.emit('joinGame', { gameId, playerId });
    });

    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion:', error);
      showError('Erreur de connexion au serveur');
    });

    setupSocketListeners();
  }
});
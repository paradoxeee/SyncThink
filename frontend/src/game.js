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
    
    // Ajouter l'écoute de l'événement allPlayersAnswered
    socketHandler.socket.on('allPlayersAnswered', () => {
      // Réduire le temps d'attente entre les rounds
      if (timerElement) {
        const currentTime = parseInt(timerElement.textContent);
        if (currentTime > 3) {
          timerElement.textContent = '3';
        }
      }
    });
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
  
  console.log('Round results received:', data);
  
  // Mettre à jour l'état du jeu avec les nouvelles données
  if (data.players) {
    window.gameState = {
      ...window.gameState,
      players: data.players,
      roundResults: {
        ...window.gameState?.roundResults,
        [data.round]: {
          question: data.question,
          answers: data.answers,
          match: data.match,
          scores: data.players.map(p => ({
            id: p.id,
            username: p.username,
            score: p.score
          }))
        }
      }
    };
    // Mettre à jour l'UI des joueurs avec les nouveaux scores
    updatePlayersUI(data.players);
  }
  
  // Vérifier si toutes les réponses sont présentes
  const allPlayersAnswered = data.players.every(player => data.answers && data.answers[player.id]);
  
  resultsDisplay.innerHTML = `
    <div class="results-content">
      <h3 class="${data.match ? 'success' : 'fail'}">
        ${data.match ? '🎉 SYNCHRONISATION ! (+10pts)' : '❌ Pas de match...'}
      </h3>
      <div class="question">Question: ${data.question}</div>
      <div class="round-info">Round ${data.round}/${data.maxRounds}</div>
      <div class="answers-list">
        ${data.players.map(player => {
          const answer = data.answers[player.id];
          return `
            <div class="answer-item ${player.id === playerId ? 'your-answer' : ''}">
              <strong>${player.username}:</strong> 
              "${answer || 'Pas de réponse'}"
            </div>
          `;
        }).join('')}
      </div>
      <div class="scores-update">
        ${data.players.map(player => `
          <div class="score-item ${player.id === playerId ? 'your-score' : ''}">
            ${player.username}: <span class="score-value">${player.score || 0}</span> pts
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Ajouter l'animation pour les scores
  if (data.match) {
    const scoreElements = document.querySelectorAll('.score-value');
    scoreElements.forEach(element => {
      element.classList.add('score-animation');
      setTimeout(() => element.classList.remove('score-animation'), 1000);
    });
  }

  // Si tous les joueurs ont répondu, réduire le temps d'attente
  if (allPlayersAnswered) {
    socketHandler.socket.emit('allPlayersAnswered', {
      gameId: gameId,
      playerId: playerId
    });
  }
}
  function updateTimer(data) {
    if (timerElement) {
      timerElement.textContent = `${data.timeLeft}s`;
      if (data.timeLeft <= 10) {
        timerElement.classList.add('warning');
      } else {
        timerElement.classList.remove('warning');
      }
    }
  }

  function showQuestion(data) {
    if (questionDisplay) {
      questionDisplay.classList.remove('hidden');
      const roundInfo = questionDisplay.querySelector('.round-info');
      if (roundInfo) {
        roundInfo.innerHTML = `Round ${data.round}/${data.maxRounds}`;
      }
      const questionElement = questionDisplay.querySelector('#current-question');
      if (questionElement) {
        questionElement.textContent = data.question;
      }
    }
    enableAnswerInput();
  }

  function showGameState(state, data) {
    if (!gameState) return;
    
    // Mettre à jour l'état global du jeu
    window.gameState = {
      ...window.gameState,
      status: state,
      players: data?.players || window.gameState?.players || []
    };
    
    switch (state) {
      case 'waiting':
        gameState.textContent = 'En attente de deux joueurs...';
        gameState.style.display = 'block';
        break;
        
      case 'playing':
        gameState.style.display = 'none';
        break;
        
      case 'finished':
        if (!data?.finalResults) return;
        
        // Préparer les données finales avec toutes les informations nécessaires
        const finalResults = {
          ...data.finalResults,
          players: data.finalResults.players,
          roundResults: window.gameState.roundResults || {},
          playerId: playerId
        };
        
        // Sauvegarder les résultats dans le localStorage
        localStorage.setItem('gameResults', JSON.stringify(finalResults));
        localStorage.setItem('playerId', playerId);
        
        // Rediriger vers la page des résultats
        window.location.href = '/results.html';
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
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    margin: 20px 0;
  }
  
  .results-content h3 {
    font-size: 24px;
    margin-bottom: 15px;
  }
  
  .results-content .question {
    font-style: italic;
    margin-bottom: 15px;
    color: #aaa;
  }
  
  .answer-item {
    margin: 10px 0;
    padding: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .answer-item.your-answer {
    background: rgba(76, 175, 80, 0.2);
  }
  
  .game-over {
    text-align: center;
    padding: 2rem;
  }
  
  .questions-summary {
    text-align: left;
    margin: 2rem 0;
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 10px;
  }
  
  .round-summary {
    margin-bottom: 1.5rem;
  }
  
  .round-question {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .player-answer {
    margin-left: 1rem;
    padding: 0.3rem 0;
  }
  
  .player-answer.your-answer {
    color: #4CAF50;
  }
  
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
    .game-over {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      margin: 2rem 0;
    }
    
    .final-results {
      margin-top: 2rem;
    }
    
    .players-ranking {
      margin: 2rem 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .player-result {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    
    .player-result.current-player {
      background: rgba(76, 175, 80, 0.2);
    }
    
    .rank {
      font-weight: bold;
      font-size: 1.2rem;
    }
    
    .name {
      flex: 1;
      margin: 0 1rem;
    }
    
    .score {
      font-weight: bold;
      color: var(--purple);
    }
    
    .winner-message {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 2rem 0;
      color: var(--purple);
    }
    
    #new-game-btn {
      background-color: var(--purple);
      color: black;
      border: 2px solid black;
      padding: 15px 30px;
      font-size: 1.2rem;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    #new-game-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .score-animation {
      animation: scoreBump 0.5s ease-out;
    }
    
    @keyframes scoreBump {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); color: #4CAF50; }
      100% { transform: scale(1); }
    }
    
    .waiting-message {
      transition: opacity 0.3s ease-out;
    }
    
    .waiting-message.hidden {
      opacity: 0;
      pointer-events: none;
    }
  `;
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
});


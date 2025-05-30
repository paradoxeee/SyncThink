// socket-handler.js - Gestion de la communication Socket.IO
import { io } from 'socket.io-client';

class SocketHandler {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.playerId = null;
    this.isConnected = false;
  }

  // Initialisation de la connexion
  init(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;

    // Connexion au serveur Socket.IO
    const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Gestion des événements de connexion
    this.socket.on('connect', () => {
      console.log('Connecté au serveur');
      this.isConnected = true;
      this.joinGame();
    });

    this.socket.on('disconnect', () => {
      console.log('Déconnecté du serveur');
      this.isConnected = false;
      if (window.gameUI) {
        window.gameUI.showToast('Déconnecté du serveur', 'error');
      }
    });

    this.socket.on('error', (error) => {
      console.error('Erreur Socket.IO:', error);
      if (window.gameUI) {
        window.gameUI.showToast(error, 'error');
      }
    });

    // Gestion des événements de jeu
    this.setupGameEvents();
  }

  // Configuration des événements de jeu
  setupGameEvents() {
    if (!this.socket) return;

    // Mise à jour de l'état du jeu
    this.socket.on('gameUpdate', (data) => {
      if (window.gameUI) {
        window.gameUI.updatePlayersUI(data.players);
        window.gameUI.showGameState(data.status, data);
      }
    });

    // Démarrage du jeu
    this.socket.on('gameStarted', (data) => {
      if (window.gameUI) {
        window.gameUI.showGameState('playing', data);
      }
    });

    // Nouveau round
    this.socket.on('newRound', (data) => {
      if (window.gameUI) {
        window.gameUI.showQuestion(data);
      }
    });

    // Mise à jour du timer
    this.socket.on('timerUpdate', (data) => {
      if (window.gameUI) {
        window.gameUI.updateTimer(data);
      }
    });

    // Résultats du round
    this.socket.on('roundResults', (data) => {
      console.log('Round results received:', data);
      if (window.gameUI) {
        // S'assurer que les données sont complètes
        if (!data.players) {
          console.error('Missing players data in round results');
          return;
        }
        window.gameUI.showRoundResults(data);
      }
    });

    // Fin de partie
    this.socket.on('gameOver', (data) => {
      console.log('GameOver event received with data:', data);
      if (window.gameUI) {
        // S'assurer que les données sont complètes
        if (!data.finalResults) {
          console.error('Missing final results data');
          return;
        }
        window.gameUI.showGameState('finished', data);
      }
    });

    // Événement quand tous les joueurs ont répondu
    this.socket.on('allPlayersAnswered', () => {
      console.log('All players have answered');
    });
  }

  // Rejoindre une partie
  joinGame() {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('joinGame', {
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  // Soumettre une réponse
  submitAnswer(answer) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('submitAnswer', {
      gameId: this.gameId,
      playerId: this.playerId,
      answer
    });
  }

  // Émettre l'événement allPlayersAnswered
  emitAllPlayersAnswered() {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('allPlayersAnswered', {
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  // Nettoyage
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

// Créer une instance unique
const socketHandler = new SocketHandler();

// Exporter l'instance
export default socketHandler; 
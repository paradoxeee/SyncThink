const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Configuration CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Headers de sécurité
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Données du jeu
const games = {};
const questions = [
  "Si tu étais un fruit, lequel serais-tu ?",
  "Quel est ton superpouvoir secret ?",
  "Quel objet représenterait le mieux ta personnalité ?",
  "Si tu devais vivre dans un autre siècle, lequel choisirais-tu ?",
  "Quel est ton film culte à voir absolument ?",
  "Quelle couleur représente le mieux ton humeur aujourd'hui ?",
  "Si tu étais un animal, lequel serais-tu ?",
  "Quel est ton plat réconfortant préféré ?",
  "Dans quel pays aimerais-tu vivre ?",
  "Quel est ton genre de musique préféré ?"
];

// Routes API
app.post("/api/create-game", (req, res) => {
  const gameId = uuidv4().slice(0, 8).toUpperCase();
  games[gameId] = {
    id: gameId,
    players: [],
    answers: {},
    scores: {},
    currentQuestion: null,
    round: 0,
    maxRounds: 5,
    status: 'waiting',
    usedQuestions: [],
    createdAt: Date.now(),
    timerInterval: null
  };
  
  console.log(`🎮 Nouvelle partie créée: ${gameId}`);
  res.status(201).json({ gameId });
});

app.post("/api/join-game/:id", (req, res) => {
  const gameId = req.params.id.toUpperCase();
  
  if (!games[gameId]) {
    return res.status(404).json({ error: "Partie introuvable" });
  }

  if (games[gameId].players.length >= 2) {
    return res.status(403).json({ error: "La partie est pleine (max 2 joueurs)" });
  }

  const playerId = uuidv4().slice(0, 8);
  
  res.json({ 
    success: true, 
    playerId,
    gameId
  });
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Nouvelle connexion: ${socket.id}`);

  socket.on('joinGame', ({ gameId, playerId, username }) => {
    gameId = gameId.toUpperCase();
    socket.join(gameId);
    
    if (!games[gameId]) {
      socket.emit('error', { message: 'Partie introuvable' });
      return;
    }

    const game = games[gameId];
    
    // Vérifier si le joueur existe déjà
    let existingPlayer = game.players.find(p => p.id === playerId);
    
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      existingPlayer.disconnectedAt = null;
    } else {
      if (game.players.length >= 2) {
        socket.emit('error', { message: 'Partie pleine' });
        return;
      }
      
      game.players.push({
        id: playerId,
        socketId: socket.id,
        username: username || `Joueur ${playerId.slice(0, 4)}`,
        score: 0,
        ready: false,
        connected: true,
        joinedAt: Date.now(),
        disconnectedAt: null
      });
      
      game.scores[playerId] = 0;
    }

    console.log(`👥 Joueur ${username} (${playerId}) a rejoint la partie ${gameId}`);
    updateGameState(gameId);
    
    // Démarrer le jeu si 2 joueurs sont connectés
    if (game.players.length === 2 && game.status === 'waiting') {
      setTimeout(() => startGameRound(gameId), 2000);
    }
  });

  socket.on('submitAnswer', ({ gameId, playerId, answer, timeLeft = 30 }) => {
    gameId = gameId.toUpperCase();
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: 'Partie introuvable' });
      return;
    }
    
    game.answers[playerId] = answer.trim();
    
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.ready = true;
      player.lastAnswerTime = Date.now();
    }
    
    updateGameState(gameId);
    
    // Vérifier si tous les joueurs ont répondu
    const connectedPlayers = game.players.filter(p => p.connected);
    if (Object.keys(game.answers).length === connectedPlayers.length) {
      clearInterval(game.timerInterval);
      setTimeout(() => calculateResults(gameId), 1000);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Déconnexion: ${socket.id}`);
    
    for (const gameId in games) {
      const game = games[gameId];
      const player = game.players.find(p => p.socketId === socket.id);
      
      if (player) {
        player.connected = false;
        player.disconnectedAt = Date.now();
        console.log(`👤 ${player.username} s'est déconnecté de la partie ${gameId}`);
        
        updateGameState(gameId);
        
        // Nettoyer les parties inactives après 30 secondes
        setTimeout(() => {
          const connectedPlayers = game.players.filter(p => p.connected);
          if (connectedPlayers.length === 0) {
            console.log(`🗑️ Suppression de la partie inactive ${gameId}`);
            clearInterval(game.timerInterval);
            delete games[gameId];
          }
        }, 30000);
        break;
      }
    }
  });
});

// Fonctions helpers
function updateGameState(gameId) {
  const game = games[gameId];
  if (!game) return;
  
  const connectedPlayers = game.players.filter(p => p.connected);
  
  io.to(gameId).emit('gameUpdate', {
    players: connectedPlayers,
    currentQuestion: game.currentQuestion,
    round: game.round,
    maxRounds: game.maxRounds,
    status: game.status,
    scores: game.scores
  });
}

function getRandomQuestion(game) {
  // Réinitialiser les questions utilisées si nécessaire
  if (game.usedQuestions.length >= questions.length) {
    game.usedQuestions = [];
  }

  const availableQuestions = questions.filter(q => !game.usedQuestions.includes(q));
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

function startGameRound(gameId) {
  const game = games[gameId];
  if (!game || game.round >= game.maxRounds) return;

  // Nettoyer l'état précédent
  clearInterval(game.timerInterval);
  game.answers = {};
  game.players.forEach(p => p.ready = false);

  // Passer au round suivant
  game.round++;
  game.status = 'playing';
  game.currentQuestion = getRandomQuestion(game);
  game.usedQuestions.push(game.currentQuestion);

  console.log(`🔄 Début round ${game.round}/${game.maxRounds} - Question: "${game.currentQuestion}"`);

  // Envoyer les données du nouveau round à tous les joueurs
  io.to(gameId).emit('newRound', {
    question: game.currentQuestion,
    round: game.round,
    maxRounds: game.maxRounds,
    timeLeft: 30
  });

  // Démarrer le timer serveur
  startServerTimer(gameId);
}

function startServerTimer(gameId) {
  const game = games[gameId];
  if (!game) return;

  let timeLeft = 30;
  game.timerInterval = setInterval(() => {
    timeLeft--;
    
    // Mettre à jour tous les clients
    io.to(gameId).emit('timerUpdate', { timeLeft });
    
    // Temps écoulé - calculer les résultats
    if (timeLeft <= 0) {
      clearInterval(game.timerInterval);
      
      // Enregistrer les réponses manquantes
      game.players.forEach(player => {
        if (!game.answers[player.id]) {
          game.answers[player.id] = "[Aucune réponse]";
          player.ready = true;
        }
      });
      
      calculateResults(gameId);
    }
  }, 1000);
}

function calculateResults(gameId) {
  const game = games[gameId];
  if (!game || !game.answers) return;

  const answers = Object.entries(game.answers);
  let match = false;
  
  // Vérifier la correspondance des réponses (seulement pour 2 joueurs)
  if (answers.length === 2) {
    const [answer1, answer2] = answers.map(([_, ans]) => ans.trim().toLowerCase());
    match = answer1 === answer2;
    console.log(`🔍 Résultats: "${answer1}" vs "${answer2}" => ${match ? 'MATCH' : 'NO MATCH'}`);
  }

  // Mettre à jour les scores si match
  if (match) {
    answers.forEach(([playerId]) => {
      game.scores[playerId] = (game.scores[playerId] || 0) + 10;
      const player = game.players.find(p => p.id === playerId);
      if (player) player.score = game.scores[playerId];
    });
  }

  // Envoyer les résultats aux joueurs
  io.to(gameId).emit('roundResults', {
    match,
    answers: game.answers,
    scores: game.scores,
    round: game.round,
    isGameOver: game.round >= game.maxRounds
  });

  // Passer au round suivant ou terminer le jeu
  if (game.round < game.maxRounds) {
    setTimeout(() => startGameRound(gameId), 5000);
  } else {
    endGame(gameId);
  }
}

function endGame(gameId) {
  const game = games[gameId];
  if (!game) return;
  
  game.status = 'finished';
  clearInterval(game.timerInterval);
  
  // Déterminer le gagnant
  const sortedScores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
  const [winnerId, winnerScore] = sortedScores[0] || ['', 0];
  const winner = game.players.find(p => p.id === winnerId);
  
  console.log(`🏆 Fin de partie ${gameId}, gagnant: ${winner?.username || 'Inconnu'}`);
  
  // Envoyer les résultats finaux
  io.to(gameId).emit('gameOver', {
    scores: game.scores,
    winner: winnerId,
    winnerName: winner?.username,
    finalScores: sortedScores
  });

  // Nettoyer la partie après 1 minute
  setTimeout(() => {
    delete games[gameId];
    console.log(`🗑️ Partie ${gameId} nettoyée`);
  }, 60000);
}

// Routes pour les pages HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/frontend/index.html'));
});

app.get('/game.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/frontend/game.html'));
});

app.get('/join-game.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/frontend/join-game.html'));
});

// Route de debug
app.get('/api/games', (req, res) => {
  const gamesList = Object.keys(games).map(id => ({
    id,
    players: games[id].players.length,
    status: games[id].status,
    round: games[id].round,
    createdAt: new Date(games[id].createdAt).toISOString()
  }));
  res.json({ games: gamesList, total: gamesList.length });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur SyncThink lancé sur http://localhost:${PORT}`);
  console.log(`📊 Debug: http://localhost:${PORT}/api/games`);
});
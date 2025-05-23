const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS || [
  'http://localhost:5173',
  'https://votre-domaine.com'
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Données du jeu
const games = {};
const questions = [
  "Si tu étais un fruit, lequel serais-tu ?",
  "Quel est ton superpouvoir secret ?",
  "Quel est ton animal préféré ?",
  "Quelle est ta couleur préférée ?",
  "Quel est ton plat préféré ?",
  "Quel est ton film préféré ?",
  "Quel est ton livre préféré ?",
  "Quel est ton sport préféré ?",
  "Quel est ton pays préféré ?",
  "Quel est ton instrument de musique préféré ?"
];

// Routes API
app.post("/api/games", (req, res) => {
  const gameId = uuidv4().slice(0, 8).toUpperCase();
  const adminToken = uuidv4();
  const { username } = req.body;

  // Créer le premier joueur (admin)
  const playerId = uuidv4();
  const player = {
    id: playerId,
    username: username || `Joueur${Math.floor(Math.random() * 1000)}`,
    score: 0,
    isAdmin: true
  };

  games[gameId] = {
    id: gameId,
    players: [player],
    status: 'waiting',
    createdAt: Date.now(),
    adminToken,
    currentRound: 0,
    maxRounds: 5,
    usedQuestions: []
  };

  res.status(201).json({ gameId, playerId, adminToken });
});

app.post("/api/games/:id/join", (req, res) => {
  const gameId = req.params.id.toUpperCase();
  const { username } = req.body;

  if (!games[gameId]) {
    return res.status(404).json({ error: "Partie introuvable" });
  }

  if (games[gameId].players.length >= 2) {
    return res.status(400).json({ error: "Partie complète" });
  }

  const playerId = uuidv4();
  const player = {
    id: playerId,
    username: username || `Joueur${games[gameId].players.length + 1}`,
    score: 0,
    isAdmin: games[gameId].players.length === 0
  };

  games[gameId].players.push(player);

  res.json({ 
    gameId,
    playerId,
    isAdmin: player.isAdmin
  });
});

// Gestion Socket.IO
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion: ${socket.id}`);

  socket.on("joinGame", ({ gameId, playerId }) => {
    const game = games[gameId];
    if (!game) {
      socket.emit("error", "Partie introuvable");
      return;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit("error", "Joueur non reconnu");
      return;
    }

    socket.join(gameId);
    player.socketId = socket.id;
    player.connected = true;

    // Notifier tous les joueurs
    io.to(gameId).emit("gameUpdate", {
      players: game.players,
      status: game.status
    });

    // Démarrer le jeu si 2 joueurs sont connectés
    if (game.players.length === 2 && game.status === 'waiting') {
      startGame(gameId);
    }
  });

  socket.on("submitAnswer", ({ gameId, playerId, answer }) => {
    const game = games[gameId];
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.answer = answer;
      player.hasAnswered = true;
    }

    // Vérifier si tous ont répondu
    if (game.players.every(p => p.hasAnswered)) {
      calculateResults(gameId);
    }
  });

  socket.on("disconnect", () => {
    // Trouver le joueur déconnecté
    for (const gameId in games) {
      const game = games[gameId];
      const player = game.players.find(p => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        io.to(gameId).emit("gameUpdate", {
          players: game.players,
          status: game.status
        });
        break;
      }
    }
  });
});

// Fonctions de jeu
function startGame(gameId) {
  const game = games[gameId];
  game.status = 'playing';
  game.currentRound = 1;

  io.to(gameId).emit("gameStarted", {
    round: game.currentRound,
    maxRounds: game.maxRounds
  });

  startRound(gameId);
}

function startRound(gameId) {
  const game = games[gameId];
  const question = getRandomQuestion(game);
  
  game.currentQuestion = question;
  game.players.forEach(p => p.hasAnswered = false);

  io.to(gameId).emit("newRound", {
    question,
    round: game.currentRound,
    timeLimit: 30
  });

  startTimer(gameId);
}

function calculateResults(gameId) {
  const game = games[gameId];
  if (!game) return;

  const answers = {};
  const scores = {};
  let match = false;

  // Collect all answers
  game.players.forEach(player => {
    answers[player.id] = player.answer;
    scores[player.id] = player.score;
  });

  // Check if all answers match
  const answerValues = Object.values(answers).filter(a => a); // Filter out undefined/null
  if (answerValues.length > 1 && answerValues.every(a => a.toLowerCase().trim() === answerValues[0].toLowerCase().trim())) {
    match = true;
    // Award points to all players
    game.players.forEach(player => {
      player.score += 1;
      scores[player.id] = player.score;
    });
  }

  // Emit results to all players
  game.players.forEach(player => {
    if (player.socketId) {
      io.to(player.socketId).emit('roundResults', {
        match,
        answers,
        scores
      });
    }
  });

  // Reset answers for next round
  game.players.forEach(player => {
    player.answer = null;
    player.hasAnswered = false;
  });

  // Passer au round suivant ou terminer
  if (game.currentRound < game.maxRounds) {
    game.currentRound++;
    setTimeout(() => startRound(gameId), 5000);
  } else {
    endGame(gameId);
  }
}

function endGame(gameId) {
  const game = games[gameId];
  game.status = 'finished';
  
  const winner = [...game.players].sort((a, b) => b.score - a.score)[0];
  
  io.to(gameId).emit("gameOver", {
    winner: winner.id,
    scores: game.players.map(p => ({ id: p.id, score: p.score }))
  });

  // Nettoyer après délai
  setTimeout(() => delete games[gameId], 60000);
}

// Helpers
function getRandomQuestion(game) {
  const availableQuestions = questions.filter(q => !game.usedQuestions?.includes(q));
  const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  game.usedQuestions.push(question);
  return question;
}

function startTimer(gameId) {
  let timeLeft = 30;
  const game = games[gameId];
  
  const timer = setInterval(() => {
    timeLeft--;
    
    io.to(gameId).emit("timerUpdate", { timeLeft });
    
    if (timeLeft <= 0 || game.players.every(p => p.hasAnswered)) {
      clearInterval(timer);
      if (!game.players.every(p => p.hasAnswered)) {
        calculateResults(gameId);
      }
    }
  }, 1000);
}

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
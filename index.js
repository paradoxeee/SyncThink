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
  'https://votre-domaine.com',
  'https://*.onrender.com'  // Pour accepter les domaines Render
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.use('/src', express.static(path.join(__dirname, 'frontend/src')));
app.use('/public', express.static(path.join(__dirname, 'frontend/public')));

// Route par défaut pour servir index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

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
  "Quel est ton instrument de musique préféré ?",
  "Si tu étais une saison, laquelle serais-tu ?",
"Si tu pouvais parler à un animal, lequel choisirais-tu ?",
"Si tu étais un personnage de dessin animé, lequel serais-tu ?",
"Quelle est ta chanson du moment ?",
"Si tu pouvais avoir un métier de rêve, ce serait quoi ?",
"Quel est ton dessert préféré ?",
"Quel est le premier mot qui te vient en tête ?",
"Si tu étais une couleur, laquelle serais-tu ?",
"Si tu pouvais vivre dans un film, ce serait lequel ?",
"Quel est ton plus grand rêve ?",
"Quelle appli utilises-tu le plus ?",
"Si tu étais une boisson, laquelle serais-tu ?",
"Quelle est la dernière chose qui t'a fait rire ?",
"Quel est ton talent caché ?",
"Si tu pouvais avoir un animal imaginaire, lequel ce serait ?",
"Quel est ton emoji préféré ?",
"Si tu pouvais dîner avec une célébrité, ce serait qui ?",
"Quel est le dernier truc que tu as regardé en boucle ?",
"Plutôt montagne ou mer ?",
"Plutôt matin ou soir ?",
"Quel est ton péché mignon ?",
"Si tu pouvais maîtriser un art (chant, danse, peinture…), tu choisirais quoi ?",
"Si tu étais un objet, tu serais quoi ?",
"Quelle odeur préfères-tu ?",
"Si tu pouvais téléporter, tu irais où en premier ?",
"Quel est ton meilleur souvenir d'enfance ?",
"Quelle est ta fête préférée ?",
"Si tu pouvais changer ton prénom, tu prendrais lequel ?",
"Quel est le son que tu trouves le plus agréable ?",
"Si tu devais manger le même plat toute ta vie, ce serait lequel ?",
"Si tu étais un personnage de jeu vidéo, qui serais-tu ?",
"Si tu pouvais maîtriser une langue instantanément, laquelle choisirais-tu ?",
"Quel est ton mot préféré en français ?",
"Si tu étais un style musical, ce serait lequel ?",
"Quel animal te représente le mieux ?",
"Si tu pouvais remonter le temps, à quelle époque irais-tu ?",
"Quel est le truc le plus fou que tu aimerais faire un jour ?",
"Si tu étais une émotion, laquelle serais-tu ?"

];

// Routes API
app.post("/api/games", (req, res) => {
  const gameId = uuidv4().slice(0, 8).toUpperCase();
  const adminToken = uuidv4();
  const { username, players } = req.body;

  // Si des joueurs existants sont fournis, les utiliser
  if (players && Array.isArray(players)) {
    games[gameId] = {
      id: gameId,
      players: players.map(p => ({
        ...p,
        score: 0,
        isAdmin: false,
        hasAnswered: false,
        answer: null
      })),
      status: 'waiting',
      createdAt: Date.now(),
      adminToken,
      currentRound: 0,
      maxRounds: 10,
      usedQuestions: [],
      shuffledQuestions: shuffle([...questions]),
      questionIndex: 0
    };

    // Définir le premier joueur comme admin
    games[gameId].players[0].isAdmin = true;

    res.status(201).json({ 
      gameId, 
      playerId: players[0].id, 
      adminToken 
    });
    return;
  }

  // Sinon, créer un nouveau joueur (comportement par défaut)
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
    maxRounds: 10,
    usedQuestions: [],
    shuffledQuestions: shuffle([...questions]),
    questionIndex: 0
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
  if (!game) return;
  
  game.status = 'playing';
  game.currentRound = 1;
  game.players.forEach(p => {
    p.score = 0;
    p.hasAnswered = false;
    p.answer = null;
  });

  io.to(gameId).emit("gameStarted", {
    round: game.currentRound,
    maxRounds: game.maxRounds,
    players: game.players
  });

  startRound(gameId);
}

function startRound(gameId) {
  const game = games[gameId];
  if (!game) return;
  
  const question = getRandomQuestion(game);
  game.currentQuestion = question;
  game.players.forEach(p => {
    p.hasAnswered = false;
    p.answer = null;
  });

  io.to(gameId).emit("newRound", {
    question,
    round: game.currentRound,
    maxRounds: game.maxRounds,
    timeLimit: 30,
    players: game.players
  });

  startTimer(gameId);
}

function calculateResults(gameId) {
  const game = games[gameId];
  if (!game) return;

  const answers = {};
  const scores = {};
  let match = false;

  // Filtrer les joueurs qui ont répondu
  const playersAnswered = game.players.filter(p => p.answer && p.answer.trim());
  
  // Vérifier si au moins 2 joueurs ont répondu et si toutes les réponses sont identiques
  if (playersAnswered.length >= 2) {
    const firstAnswer = playersAnswered[0].answer.toLowerCase().trim();
    match = playersAnswered.every(p => p.answer.toLowerCase().trim() === firstAnswer);
    
    if (match) {
      game.players.forEach(player => {
        player.score += 10;
        scores[player.id] = player.score;
      });
    }
  }

  // Récupérer toutes les réponses (même vides)
  game.players.forEach(player => {
    answers[player.id] = player.answer;
    scores[player.id] = player.score;
  });

  // Envoyer les résultats
  io.to(gameId).emit('roundResults', {
    match,
    answers,
    scores,
    round: game.currentRound,
    maxRounds: game.maxRounds,
    players: game.players,
    question: game.currentQuestion // Ajout de la question courante
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
  if (!game) return;
  
  game.status = 'finished';
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  
  io.to(gameId).emit("gameOver", {
    winner: winner.id,
    scores: game.players.map(p => ({ id: p.id, score: p.score })),
    players: game.players,
    finalResults: {
      winner: winner,
      players: sortedPlayers,
      questions: game.usedQuestions, // Toutes les questions posées
      answers: game.players.map(p => ({ // Réponses par round
        id: p.id, 
        username: p.username, 
        answers: game.usedQuestions.map((q, i) => ({
          question: q,
          answer: p.answers ? p.answers[i] : null
        }))
      }))
    }
  });

  // Nettoyer après délai
  setTimeout(() => delete games[gameId], 60000);
}

// Helpers
function shuffle(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function getRandomQuestion(game) {
  if (!game.shuffledQuestions || game.questionIndex >= game.shuffledQuestions.length) {
    game.shuffledQuestions = shuffle([...questions]);
    game.questionIndex = 0;
  }
  
  const question = game.shuffledQuestions[game.questionIndex];
  game.questionIndex++;
  game.usedQuestions.push(question);
  return question;
}

function startTimer(gameId) {
  let timeLeft = 30;
  const game = games[gameId];
  if (!game) return;
  
  const timer = setInterval(() => {
    timeLeft--;
    
    io.to(gameId).emit("timerUpdate", { 
      timeLeft,
      round: game.currentRound,
      maxRounds: game.maxRounds
    });
    
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
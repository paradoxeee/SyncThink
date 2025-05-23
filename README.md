# SyncThink

SyncThink est un jeu multijoueur en temps réel où les joueurs essaient de penser de la même manière. Le jeu se joue à deux joueurs qui doivent répondre à des questions de manière synchronisée.

## Fonctionnalités

- Création de parties avec un ID unique
- Rejoindre une partie existante
- Questions aléatoires pour chaque round
- Système de score en temps réel
- Interface utilisateur réactive et moderne
- Communication en temps réel via Socket.IO

## Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-username/syncthink.git
cd syncthink
```

2. Installez les dépendances :
```bash
npm install
```

3. Démarrez le serveur en mode développement :
```bash
npm run dev
```

4. Ouvrez votre navigateur et accédez à `http://localhost:3000`

## Déploiement

### Backend (Railway)

1. Créez un compte sur [Railway](https://railway.app/)
2. Connectez votre dépôt GitHub
3. Configurez les variables d'environnement :
   - `PORT` : 3000
   - `ALLOWED_ORIGINS` : URL de votre frontend

### Frontend (Vercel)

1. Créez un compte sur [Vercel](https://vercel.com)
2. Importez votre projet
3. Configurez les variables d'environnement :
   - `VITE_API_URL` : URL de votre backend Railway

## Structure du Projet

```
syncthink/
├── frontend/
│   ├── src/
│   │   ├── game.js
│   │   ├── socket-handler.js
│   │   └── style.css
│   ├── game.html
│   └── join-game.html
├── index.js
├── package.json
└── README.md
```

## Technologies Utilisées

- Frontend :
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - Socket.IO Client

- Backend :
  - Node.js
  - Express
  - Socket.IO
  - UUID

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails. 
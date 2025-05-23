// server.js (Frontend Utilities)

// Fonction d'initialisation principale
function initializeGameHandlers() {
  // Debug - vérifie que le script est bien chargé
  console.log('Initialisation des gestionnaires de jeu...');

  // Gestionnaire de création de partie
  const createButton = document.getElementById("create-game");
  if (createButton) {
    createButton.addEventListener("click", handleCreateGame);
    console.log('Gestionnaire "Create Game" attaché');
  } else {
    console.warn('Bouton "Create Game" non trouvé');
  }

  // Gestionnaire de connexion à une partie
  const joinButton = document.getElementById("submitJoin");
  if (joinButton) {
    joinButton.addEventListener("click", handleJoinGame);
    console.log('Gestionnaire "Join Game" attaché');
  }

  // Gestionnaire de liens internes (smooth scroll)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", handleSmoothScroll);
  });

  // Animations des boutons
  document.querySelectorAll(".button").forEach(button => {
    button.addEventListener("mouseenter", handleButtonHover);
    button.addEventListener("mouseleave", handleButtonLeave);
  });

  // Ajout des styles pour les toasts
  addToastStyles();
}

// Fonctions principales
async function handleCreateGame(e) {
  e.preventDefault();
  console.log('Création de partie déclenchée');
  
  const button = e.currentTarget;
  const originalText = button.innerHTML;
  
  try {
    // Feedback visuel
    button.disabled = true;
    button.innerHTML = `
      <span class="spinner"></span> Création...
    `;
    
    // Appel API avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch("https://syncthink.onrender.com/api/create-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Gestion des erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Erreur ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Erreur lors de la création");
    }

    // Traitement de la réponse
    const { gameId } = await response.json();
    const playerId = generatePlayerId();
    
    // Stockage local
    storePlayerSession(gameId, playerId);
    
    // Redirection
    console.log(`Redirection vers la partie ${gameId}`);
    window.location.href = buildGameUrl(gameId, playerId);

  } catch (error) {
    console.error("Erreur création de partie:", error);
    showToast(
      error.name === 'AbortError' 
        ? "Le serveur met trop de temps à répondre" 
        : error.message, 
      "error"
    );
    resetButton(button, originalText);
  }
}

async function handleJoinGame() {
  console.log('Tentative de rejoindre une partie');
  
  const gameIdInput = document.getElementById("gameIdInput");
  const button = document.getElementById("submitJoin");
  
  if (!gameIdInput || !button) {
    console.error('Éléments pour rejoindre une partie non trouvés');
    return;
  }

  const gameId = gameIdInput.value.trim().toUpperCase();
  const originalText = button.innerHTML;

  // Validation
  if (!gameId) {
    showToast("Veuillez entrer un ID de partie", "warning");
    return;
  }

  try {
    // Feedback visuel
    button.disabled = true;
    button.innerHTML = `
      <span class="spinner"></span> Connexion...
    `;

    // Appel API avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      `https://syncthink.onrender.com/api/join-game/${encodeURIComponent(gameId)}`, 
      { 
        method: "POST",
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    // Gestion des erreurs
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Erreur ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Échec de la connexion");
    }

    // Traitement de la réponse
    const { playerId } = await response.json();
    storePlayerSession(gameId, playerId);
    console.log(`Redirection vers la partie ${gameId}`);
    window.location.href = buildGameUrl(gameId, playerId);

  } catch (error) {
    console.error("Erreur connexion:", error);
    showToast(
      error.name === 'AbortError' 
        ? "Le serveur met trop de temps à répondre" 
        : error.message, 
      "error"
    );
    resetButton(button, originalText);
  }
}

// Fonctions utilitaires
function handleSmoothScroll(e) {
  e.preventDefault();
  const target = document.querySelector(this.getAttribute("href"));
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function handleButtonHover() {
  this.style.transform = "translateY(-3px)";
  this.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
}

function handleButtonLeave() {
  this.style.transform = "";
  this.style.boxShadow = "";
}

function generatePlayerId() {
  // Utiliser crypto.randomUUID s'il est disponible
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback sécurisé utilisant getRandomValues
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // Conversion en UUID v4
  array[6] = (array[6] & 0x0f) | 0x40; // Version 4
  array[8] = (array[8] & 0x3f) | 0x80; // Variant RFC4122
  
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function storePlayerSession(gameId, playerId) {
  try {
    localStorage.setItem(`syncThink_${gameId}_player`, playerId);
    localStorage.setItem("lastGameId", gameId);
  } catch (e) {
    console.warn("Erreur stockage local:", e);
    // Fallback vers sessionStorage si localStorage n'est pas disponible
    try {
      sessionStorage.setItem(`syncThink_${gameId}_player`, playerId);
      sessionStorage.setItem("lastGameId", gameId);
    } catch (e2) {
      console.error("Stockage local impossible:", e2);
    }
  }
}

function buildGameUrl(gameId, playerId) {
  // Construire une URL absolue basée sur l'URL actuelle
  const baseUrl = new URL(window.location.href);
  baseUrl.pathname = '/game.html';
  baseUrl.search = `?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}`;
  return baseUrl.toString();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Nettoyer les anciens toasts
  const oldToasts = document.querySelectorAll('.toast:not(.show)');
  oldToasts.forEach(t => t.remove());

  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 10);
}

function resetButton(button, originalHTML) {
  if (button) {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

function addToastStyles() {
  if (document.getElementById('toast-styles')) return;

  const style = document.createElement("style");
  style.id = 'toast-styles';
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      max-width: 80vw;
      word-wrap: break-word;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-10px);
    }
    .toast.error { background: #ff4444; }
    .toast.success { background: #00C851; }
    .toast.warning { background: #ffbb33; color: black; }
    .toast.info { background: #33b5e5; }
    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid rgba(0,0,0,0.2);
      border-radius: 50%;
      border-top-color: currentColor;
      animation: spin 1s linear infinite;
      margin-right: 0.5em;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Initialisation lorsque le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGameHandlers);
} else {
  initializeGameHandlers();
}
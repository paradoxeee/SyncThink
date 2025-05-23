// create-game.js - Gestion de la création de partie
document.addEventListener('DOMContentLoaded', () => {
  const createGameButton = document.getElementById('create-game');
  
  if (createGameButton) {
    createGameButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Demander le pseudo du joueur
      const username = prompt('Entrez votre pseudo :');
      if (!username) return; // Annuler si l'utilisateur n'a pas entré de pseudo
      
      try {
        // Appel à l'API pour créer une partie
        const response = await fetch('/api/games', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username })
        });

        if (!response.ok) {
          throw new Error('Failed to create game');
        }

        const data = await response.json();
        
        // Stocker l'ID de la partie et le pseudo
        localStorage.setItem('lastGameId', data.gameId);
        localStorage.setItem('username', username);
        
        // Rediriger vers la page de jeu
        window.location.href = `/game.html?gameId=${data.gameId}&playerId=${data.playerId}`;
      } catch (error) {
        console.error('Error creating game:', error);
        showToast(error.message, 'error');
      }
    });
  }
});

// Fonction utilitaire pour afficher les toasts
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
} 
const config = {
  // En développement, utilise l'URL locale
  // En production, utilise l'URL du backend déployé
  backendUrl: import.meta.env.PROD 
    ? 'https://votre-app.onrender.com'  // À remplacer par votre URL Render
    : 'http://localhost:3000'
};

export default config; 
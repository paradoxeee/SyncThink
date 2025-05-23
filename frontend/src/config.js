const config = {
  // En développement, utilise l'URL locale
  // En production, utilise l'URL du backend déployé
  backendUrl: import.meta.env.PROD 
    ? 'https://syncthink.onrender.com'  // URL de votre backend Render
    : 'http://localhost:3000'
};

export default config; 
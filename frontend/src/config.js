const config = {
  // En développement, utilise l'URL locale
  // En production, utilise l'URL du backend déployé
  backendUrl: import.meta.env.PROD 
    ? 'https://web-production-5d0b9.up.railway.app/'  // URL de votre backend Railway
    : 'http://localhost:3000'
};

export default config; 
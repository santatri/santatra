const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

// Middleware d'autorisation
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit. Rôle insuffisant.' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
// const express = require('express');
// const { createUser, getCentres } = require('../controllers/usersController');

// const router = express.Router();

// router.get('/centres', getCentres);
// router.post('/', createUser);

// module.exports = router;

// routes/users.js
const express = require('express');
const { 
  getCentres, 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  changePassword 
} = require('../controllers/usersController');

const router = express.Router();

// Ces routes doivent être définies avant les routes paramétrées
router.get('/centres', getCentres);
router.get('/', getUsers); // Route pour récupérer tous les utilisateurs
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', changePassword);

module.exports = router;

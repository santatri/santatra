const express = require('express');
const {
  getEtudiants,
  getEtudiantDetails,
  createEtudiant,
  updateEtudiant,
  deleteEtudiant,
  searchEtudiants
} = require('../controllers/etudiantsController');

const router = express.Router();

// Routes publiques (sans authentification pour le développement)
router.get('/', getEtudiants);
router.get('/search', searchEtudiants);
router.get('/:id', getEtudiantDetails);
router.post('/', createEtudiant);
router.put('/:id', updateEtudiant);
router.delete('/:id', deleteEtudiant);

module.exports = router;
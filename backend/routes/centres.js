const express = require('express');
const {
  getCentres,
  createCentre,
  updateCentre,
  deleteCentre,
  searchCentres
} = require('../controllers/centresController');

const router = express.Router();

// Routes pour les centres
router.get('/', getCentres); // Récupérer tous les centres
router.get('/search', searchCentres); // Rechercher des centres
router.post('/', createCentre); // Créer un centre
router.put('/:id', updateCentre); // Mettre à jour un centre
router.delete('/:id', deleteCentre); // Supprimer un centre

module.exports = router;
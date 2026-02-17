const express = require('express');
const {
  getFormations,
  createFormation,
  updateFormation,
  deleteFormation
} = require('../controllers/formationsController');

const router = express.Router();

// Routes pour les formations
router.get('/', getFormations); // Récupérer toutes les formations
router.post('/', createFormation); // Créer une formation
router.put('/:id', updateFormation); // Mettre à jour une formation
router.delete('/:id', deleteFormation); // Supprimer une formation

module.exports = router;
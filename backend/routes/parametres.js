const express = require('express');
const router = express.Router();
const parametresController = require('../controllers/parametresController');

// Récupérer les étudiants éligibles à la suppression
router.get('/etudiants-to-delete', parametresController.getEtudiantsToDelete);

// Supprimer un étudiant complètement
router.delete('/etudiants/:etudiantId', parametresController.deleteEtudiantCompletely);

// Supprimer plusieurs étudiants
router.post('/etudiants/delete-multiple', parametresController.deleteEtudiantsMultiple);

// Exporter la base de données
router.get('/export', parametresController.exportDatabase);

module.exports = router;

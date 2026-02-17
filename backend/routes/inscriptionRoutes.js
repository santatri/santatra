const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');

// Routes pour les inscriptions
router.get('/', inscriptionController.getAllInscriptions);
router.get('/stats', inscriptionController.getStats);
router.get('/:id', inscriptionController.getInscriptionById);
router.post('/', inscriptionController.createInscription);
router.put('/:id', inscriptionController.updateInscription);
router.delete('/:id', inscriptionController.deleteInscription);

module.exports = router;
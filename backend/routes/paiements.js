const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');

// Récupérer tous les paiements (optionnel: ?centre_id=&formation_id=)
router.get('/', paiementController.getAllPaiements);

// Récupérer données dashboard montants (optionnel: ?centre_id=)
router.get('/dashboard/montants', paiementController.getDashboardMontants);

// Récupérer retards de paiement (optionnel: ?centre_id=)
router.get('/retards/list', paiementController.getRetardsPaiement);

// Créer un paiement (droits ou formation)
router.post('/', paiementController.createPaiement);

// Paiement groupé (plusieurs mois)
router.post('/batch', paiementController.createPaiementGroup);

// Récupérer les paiements pour une inscription
router.get('/inscription/:inscriptionId', paiementController.getPaiementsByInscription);

// Récupérer le dernier montant des droits d'inscription
router.get('/droits', paiementController.getLatestDroits);

module.exports = router;

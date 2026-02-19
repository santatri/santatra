const express = require('express');
const router = express.Router();
const examenController = require('../controllers/examenController');

// Routes examens
router.get('/', examenController.getAllExamens); // OK
// Attention: placer les routes spécifiques AVANT la route paramétrée
router.get('/paiements', examenController.getAllPaiements);
router.post('/paiements', examenController.createPaiementExamen);
router.get('/paiements/inscription/:inscriptionId', examenController.getPaiementsByInscription); // à créer
router.delete('/paiements/:paiementId', examenController.deletePaiementExamen); // suppression paiement
router.put('/paiements/:paiementId', examenController.updatePaiementExamen); // modification paiement
router.get('/:id', examenController.getExamenById); // OK
router.post('/', examenController.createExamen); // OK
router.put('/:id', examenController.updateExamen); // ATTENTION : updateExamen doit être une fonction
router.delete('/:id', examenController.deleteExamen); // OK

// Routes paiements


module.exports = router;

const express = require('express');
const {
  getLivres,
  getLivreDetails,
  createLivre,
  updateLivre,
  deleteLivre,
  getLivresByFormation,
  searchLivres
} = require('../controllers/livresController');

const router = express.Router();

// Routes pour les livres
router.get('/', getLivres);
router.get('/search', searchLivres);
router.get('/formation/:formation_id', getLivresByFormation);
router.get('/:id', getLivreDetails);
router.post('/', createLivre);
router.put('/:id', updateLivre);
router.delete('/:id', deleteLivre);

module.exports = router;

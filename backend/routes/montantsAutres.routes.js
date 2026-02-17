const express = require('express');
const {
  createMontantAutre,
  getMontantsAutres,
  getMontantAutreById,
  updateMontantAutre,
  deleteMontantAutre
} = require('../controllers/montantsAutres.controller');

const router = express.Router();

router.post('/', createMontantAutre);
router.get('/', getMontantsAutres);
router.get('/:id', getMontantAutreById);
router.put('/:id', updateMontantAutre);
router.delete('/:id', deleteMontantAutre);

module.exports = router;
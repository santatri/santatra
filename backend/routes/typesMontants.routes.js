const express = require('express');
const {
  createTypeMontant,
  getAllTypesMontants,
  getTypeMontantById,
  updateTypeMontant,
  deleteTypeMontant
} = require('../controllers/typesMontants.controller');

const router = express.Router();

router.post('/', createTypeMontant);
router.get('/', getAllTypesMontants);
router.get('/:id', getTypeMontantById);
router.put('/:id', updateTypeMontant);
router.delete('/:id', deleteTypeMontant);

module.exports = router;
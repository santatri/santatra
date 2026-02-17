const express = require('express');
const router = express.Router();
const controller = require('../controllers/depensesObligatoiresController');

router.get('/', controller.getDepensesObligatoires);
router.post('/', controller.createDepenseObligatoire);
router.put('/:id', controller.updateDepenseObligatoire);
router.delete('/:id', controller.deleteDepenseObligatoire);

module.exports = router;

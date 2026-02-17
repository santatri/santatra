const express = require('express');
const router = express.Router();
const droitsController = require('../controllers/droitsController');

router.get('/', droitsController.getAllDroits);
router.get('/:id', droitsController.getDroitById);
router.post('/', droitsController.createDroit);
router.put('/:id', droitsController.updateDroit);
router.delete('/:id', droitsController.deleteDroit);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDepenses, getDepenseById, createDepense, updateDepense, deleteDepense } = require('../controllers/depensesController');

// Routes CRUD
router.get('/', getDepenses);
router.get('/:id', getDepenseById);
router.post('/', createDepense);
router.put('/:id', updateDepense);
router.delete('/:id', deleteDepense);

module.exports = router;

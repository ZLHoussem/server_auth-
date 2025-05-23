const express = require('express');
const router = express.Router();
const villeController = require('../controllers/villeController');

router.post('/add', villeController.addVille);
router.delete('/:id', villeController.deleteVille);
router.get('/', villeController.getVilles);
module.exports = router;

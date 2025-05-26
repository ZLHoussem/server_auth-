const express = require('express');
const {
  createDemandeTransport,
  getAllDemandeTransports,
  getDemandeTransportById,
  updateDemandeTransport,
  deleteDemandeTransport,
} = require('../controllers/demandeTransportController');

const router = express.Router();

// Route to create a new DemandeTransport and get all DemandeTransports
router
  .route('/')
  .post(createDemandeTransport)
  .get(getAllDemandeTransports);

// Route to get, update, and delete a specific DemandeTransport by ID
router
  .route('/:id')
  .get(getDemandeTransportById)
  .put(updateDemandeTransport)
  .delete(deleteDemandeTransport);

module.exports = router;

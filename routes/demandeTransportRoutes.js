const express = require('express');
const {
  createDemandeTransport,
  getAllDemandeTransports,
  getDemandeTransportById,
  updateDemandeTransport,
  deleteDemandeTransport,

  acceptProposal,
  rejectProposal,
  proposePriceUser,
  getDemandesByUser,
  getDemandesByDriver,
  getDemandesByStatus,
  updateStatutLivraison,
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
  
router.put('/:id/accept', acceptProposal);
router.put('/:id/reject', rejectProposal);
router.put('/:id/propose-price', proposePriceUser);

// Filter routes
router.get('/user/:userId', getDemandesByUser);
router.get('/driver/:driverId', getDemandesByDriver);
router.get('/status/:status', getDemandesByStatus);

///
router.put('/:id/status',updateStatutLivraison)

module.exports = router;

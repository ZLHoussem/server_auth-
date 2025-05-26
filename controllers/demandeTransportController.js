const DemandeTransport = require('../models/DemandeTransport');
const Baggage = require('../models/Baggage'); // To validate baggage IDs

// @desc    Create a new DemandeTransport
// @route   POST /api/demandes-transport
// @access  Private (to be decided based on auth implementation)
exports.createDemandeTransport = async (req, res, next) => {
  try {
    const {
      poisColieTotal,
      pointRamasage,
      pointLivrison,
      id_driver,
      prixProposer,
      statutsDemande,
      id_traject,
      id_user,
      proposerDriver,
      proposerUser,
      id_bagages,
    } = req.body;

    // Validate baggage IDs
    if (id_bagages && id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({ '_id': { $in: id_bagages } });
      if (baggageDocs.length !== id_bagages.length) {
        return res.status(400).json({ success: false, message: 'One or more baggage IDs are invalid.' });
      }
    } else {
        return res.status(400).json({ success: false, message: 'At least one baggage ID is required.' });
    }

    const demandeTransport = await DemandeTransport.create({
      poisColieTotal,
      pointRamasage,
      pointLivrison,
      id_driver,
      prixProposer,
      statutsDemande,
      id_traject,
      id_user,
      proposerDriver,
      proposerUser,
      id_bagages,
    });

    res.status(201).json({
      success: true,
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all DemandeTransport documents
// @route   GET /api/demandes-transport
// @access  Public (or Private depending on requirements)
exports.getAllDemandeTransports = async (req, res, next) => {
  try {
    const demandesTransport = await DemandeTransport.find().populate('id_bagages');
    res.status(200).json({
      success: true,
      count: demandesTransport.length,
      data: demandesTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single DemandeTransport by ID
// @route   GET /api/demandes-transport/:id
// @access  Public (or Private)
exports.getDemandeTransportById = async (req, res, next) => {
  try {
    const demandeTransport = await DemandeTransport.findById(req.params.id).populate('id_bagages');
    if (!demandeTransport) {
      return res.status(404).json({ success: false, message: `DemandeTransport not found with id of ${req.params.id}` });
    }
    res.status(200).json({
      success: true,
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a DemandeTransport
// @route   PUT /api/demandes-transport/:id
// @access  Private
exports.updateDemandeTransport = async (req, res, next) => {
  try {
    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({ success: false, message: `DemandeTransport not found with id of ${req.params.id}` });
    }

    // Validate baggage IDs if provided in update
    if (req.body.id_bagages && req.body.id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({ '_id': { $in: req.body.id_bagages } });
      if (baggageDocs.length !== req.body.id_bagages.length) {
        return res.status(400).json({ success: false, message: 'One or more baggage IDs are invalid for update.' });
      }
    } else if (req.body.id_bagages && req.body.id_bagages.length === 0) {
         return res.status(400).json({ success: false, message: 'At least one baggage ID is required for update.' });
    }


    demandeTransport = await DemandeTransport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('id_bagages');

    res.status(200).json({
      success: true,
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a DemandeTransport
// @route   DELETE /api/demandes-transport/:id
// @access  Private
exports.deleteDemandeTransport = async (req, res, next) => {
  try {
    const demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({ success: false, message: `DemandeTransport not found with id of ${req.params.id}` });
    }

    await demandeTransport.deleteOne(); // Corrected from .remove() which is deprecated

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

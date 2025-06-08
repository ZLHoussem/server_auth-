const DemandeTransport = require("../models/DemandeTransport");
const Baggage = require("../models/Baggage"); // To validate baggage IDs

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
      updateStatutLivraison,
    } = req.body;

    // Validate baggage IDs
    if (id_bagages && id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({ _id: { $in: id_bagages } });
      if (baggageDocs.length !== id_bagages.length) {
        return res
          .status(400)
          .json({
            success: false,
            message: "One or more baggage IDs are invalid.",
          });
      }
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one baggage ID is required.",
        });
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
      updateStatutLivraison,
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
    const demandesTransport = await DemandeTransport.find()
      .populate("id_bagages")
      .sort({ updatedAt: -1 }); // -1 for descending order (most recent first)

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
    const demandeTransport = await DemandeTransport.findById(
      req.params.id
    ).populate("id_bagages");
    if (!demandeTransport) {
      return res
        .status(404)
        .json({
          success: false,
          message: `DemandeTransport not found with id of ${req.params.id}`,
        });
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
      return res
        .status(404)
        .json({
          success: false,
          message: `DemandeTransport not found with id of ${req.params.id}`,
        });
    }

    // Validate baggage IDs if provided in update
    if (req.body.id_bagages && req.body.id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({
        _id: { $in: req.body.id_bagages },
      });
      if (baggageDocs.length !== req.body.id_bagages.length) {
        return res
          .status(400)
          .json({
            success: false,
            message: "One or more baggage IDs are invalid for update.",
          });
      }
    } else if (req.body.id_bagages && req.body.id_bagages.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one baggage ID is required for update.",
        });
    }

    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("id_bagages");

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
      return res
        .status(404)
        .json({
          success: false,
          message: `DemandeTransport not found with id of ${req.params.id}`,
        });
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
// @desc    Accept a driver's proposal
// @route   PUT /api/demandes-transport/:id/accept
// @access  Private
exports.acceptProposal = async (req, res, next) => {
  try {
    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Check if there's a proposal to accept
    if (
      demandeTransport.statutsDemande === "pending" &&
      !demandeTransport.proposerDriver
    ) {
      return res.status(400).json({
        success: false,
        message: "No driver proposal to accept",
      });
    }

    // Update to accepted status
    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      {
        statutsDemande: "accepted",
        proposerDriver: true,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Proposal accepted successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a driver's proposal
// @route   PUT /api/demandes-transport/:id/reject
// @access  Private
exports.rejectProposal = async (req, res, next) => {
  try {
    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Update to rejected status
    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      {
        statutsDemande: "rejected",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Proposal rejected successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a counter proposal or initial price proposal
// @route   PUT /api/demandes-transport/:id/propose-price
// @access  Private
exports.proposePriceUser = async (req, res, next) => {
  try {
    const { prixProposer } = req.body;

    // Validate price
    if (
      !prixProposer ||
      typeof prixProposer !== "number" ||
      prixProposer <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid price proposal is required",
      });
    }

    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Check if the proposed price is different from current price
    if (demandeTransport.prixProposer === prixProposer) {
      return res.status(400).json({
        success: false,
        message: "Proposed price must be different from current price",
      });
    }

    // Update with new price and status
    const updateData = {
      prixProposer: prixProposer,
      statutsDemande: "in_progress",
      proposerUser: true,
      updatedAt: new Date(),
    };

    // If it's a counter-proposal, also update proposerDriver to false
    if (demandeTransport.proposerDriver) {
      updateData.proposerDriver = false;
    }

    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Price proposal sent successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by user ID with proposal status
// @route   GET /api/demandes-transport/user/:userId
// @access  Private
exports.getDemandesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const demandes = await DemandeTransport.find({ id_user: userId })
      .populate("id_bagages")
      .populate("id_driver", "nom prenom telephone") // Populate driver info if needed
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by driver ID
// @route   GET /api/demandes-transport/driver/:driverId
// @access  Private
exports.getDemandesByDriver = async (req, res, next) => {
  try {
    const { driverId } = req.params;

    const demandes = await DemandeTransport.find({ id_driver: driverId })
      .populate("id_bagages")
      .populate("id_user", "nom prenom telephone") // Populate user info if needed
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by status
// @route   GET /api/demandes-transport/status/:status
// @access  Private
exports.getDemandesByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    // Validate status
    const validStatuses = [
      "pending",
      "in_progress",
      "accepted",
      "rejected",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    const demandes = await DemandeTransport.find({ statutsDemande: status })
      .populate("id_bagages")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};
// PUT - Modifier le statut de livraison d'une demande
exports.updateStatutLivraison = async (req, res) => {
  try {
    const { id } = req.params;
    const { statuts } = req.body;

    // Validation du statut
    const statutsValides = [
     'Payé', 'collecté', 'En dépot', 'En livrison', 'Livré'
    ];
    if (!statutsValides.includes(statuts)) {
      return res.status(400).json({
        success: false,
        message: "Statut de livraison invalide",
        statutsValides,
      });
    }

    const demande = await DemandeTransport.findById(id);
    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande de transport non trouvée",
      });
    }

    // Logique de progression des statuts (optionnel)
    const ordreStatuts = [
    'Payé', 'collecté', 'En dépot', 'En livrison', 'Livré'
    ];
    const indexActuel = ordreStatuts.indexOf(demande.statuts);
    const indexNouveau = ordreStatuts.indexOf(statuts);

    // Empêcher le retour en arrière (optionnel - peut être retiré si non souhaité)
    if (indexNouveau < indexActuel) {
      return res.status(400).json({
        success: false,
        message: "Impossible de revenir à un statut antérieur",
        statutActuel: demande.statuts,
        statutDemande: statuts,
      });
    }

    const demandeMiseAJour = await DemandeTransport.findByIdAndUpdate(
      id,
      {
        statuts,
        $push: {
          historiqueStatuts: {
            statut: statuts,
            date: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("id_driver", "nom prenom")
      .populate("id_user", "nom prenom");

    res.json({
      success: true,
      message: "Statut de livraison mis à jour avec succès",
      data: demandeMiseAJour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du statut",
      error: error.message,
    });
  }
};

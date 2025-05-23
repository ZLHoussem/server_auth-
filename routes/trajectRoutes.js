const express = require('express');
const router = express.Router();
const Traject = require('../models/Traject');

// GET all trajets
router.get('/', async (req, res, next) => {
  try {
    const trajets = await Traject.find();
    res.status(200).json(trajets);
  } catch (error) {
    next(error);
  }
});
// GET trajets in descending order by createdAt
router.get('/recent', async (req, res, next) => {
  try {
    const { idChauffeur } = req.query;
    
    // Validate that idChauffeur is provided
    if (!idChauffeur) {
      return res.status(400).json({ 
        error: 'idChauffeur is required' 
      });
    }

    // Get today's date at start of day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query trajets for the specific chauffeur from today onwards, sorted by date
    const trajets = await Traject.find({
      idChauffeur: idChauffeur,
      dateTraject: { $gte: today } // Only trajets from today onwards
    }).sort({ dateTraject: 1 }); // Sort by date ascending (earliest first)

    res.status(200).json(trajets);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { from, to, date, type, range } = req.query;
    
    if (!from || !to || !date || !type) {
      return res.status(400).json({ 
        message: 'Missing required parameters. Please provide from, to, date, and type.' 
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // Calculate date range
    const dateRangeDays = range ? parseInt(range) : 5;
    const endDate = new Date(dateObj);
    dateObj.setDate(dateObj.getDate() - dateRangeDays)
    endDate.setDate(endDate.getDate() + dateRangeDays);

    // Build query
    const query = {
      pointRamasage: { $in: [from] },
      pointLivraison: { $in: [to] },
      modetransport: type,
      dateTraject: {
        $gte: dateObj,
        $lte: endDate
      }
    };

    const trajets = await Traject.find(query).sort({ dateTraject: 1 });
    
    res.status(200).json(trajets);
  } catch (error) {
    console.error('Search error:', error);
    // Check for specific error types
    if (error.message.startsWith('Format de date invalide')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// GET trajet by ID
router.get('/:id', async (req, res, next) => {
  try {
    const trajet = await Traject.findById(req.params.id);
    if (!trajet) {
      return res.status(404).json({ message: 'Trajet not found' });
    }
    res.status(200).json(trajet);
  } catch (error) {
    next(error);
  }
});

// CREATE new trajet
router.post('/', async (req, res, next) => {
  try {
    const newTrajet = new Traject(req.body);
    const savedTrajet = await newTrajet.save();
    res.status(201).json(savedTrajet);
  } catch (error) {
    next(error);
  }
});

// UPDATE trajet
router.put('/:id', async (req, res, next) => {
  try {
    const updatedTrajet = await Traject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedTrajet) {
      return res.status(404).json({ message: 'Trajet not found' });
    }
    
    res.status(200).json(updatedTrajet);
  } catch (error) {
    next(error);
  }
});

// DELETE trajet
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format (if using MongoDB)
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid trajet ID format',
        error: 'ID must be a valid MongoDB ObjectId'
      });
    }
    
    console.log(`Attempting to delete trajet with ID: ${id}`);
    
    const deletedTrajet = await Traject.findByIdAndDelete(id);
    
    if (!deletedTrajet) {
      console.log(`Trajet with ID ${id} not found`);
      return res.status(404).json({ 
        message: 'Trajet not found',
        id: id
      });
    }
    
    console.log(`Successfully deleted trajet with ID: ${id}`);
    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting trajet:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid trajet ID',
        error: error.message
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        error: error.message
      });
    }
    
    // Generic server error
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});
module.exports = router;

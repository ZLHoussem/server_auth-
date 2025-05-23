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
      const trajets = await Traject.find().sort({ dateTraject: 1 });
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
    const deletedTrajet = await Traject.findByIdAndDelete(req.params.id);
    
    if (!deletedTrajet) {
      return res.status(404).json({ message: 'Trajet not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

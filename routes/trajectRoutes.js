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
    const { id } = req.params;
    
    console.log('Searching for traject with ID:', id);
    console.log('ID type:', typeof id);
    console.log('ID length:', id.length);
    
    // Try multiple search methods to debug
    
    // Method 1: Direct findById
    console.log('Method 1: Using findById...');
    let trajet = await Traject.findById({_id:id});
    console.log('FindById result:', trajet ? 'Found' : 'Not found');
    
    if (!trajet) {
      // Method 2: Using findOne with _id
      console.log('Method 2: Using findOne with _id...');
      trajet = await Traject.findOne({ _id: id });
      console.log('FindOne with _id result:', trajet ? 'Found' : 'Not found');
    }
    
    if (!trajet) {
      // Method 3: Using string comparison
      console.log('Method 3: Using findOne with string _id...');
      trajet = await Traject.findOne({ _id: id.toString() });
      console.log('FindOne with string _id result:', trajet ? 'Found' : 'Not found');
    }
    
    if (!trajet) {
      // Method 4: Search all trajets to see what IDs exist
      console.log('Method 4: Checking all traject IDs...');
      const allTrajets = await Traject.find({}, { _id: 1 }).limit(10);
      console.log('Available traject IDs:');
      allTrajets.forEach(t => {
        console.log('  - ID:', t._id.toString(), 'Match:', t._id.toString() === id);
      });
      
      return res.status(404).json({ 
        message: 'Trajet not found after trying multiple methods',
        searchedId: id,
        availableIds: allTrajets.map(t => t._id.toString()),
        debug: {
          searchedIdType: typeof id,
          searchedIdLength: id.length,
          isValidObjectId: id.match(/^[0-9a-fA-F]{24}$/) !== null
        }
      });
    }

    console.log('Traject found successfully');
    
    // Return the traject data
    res.status(200).json({
      success: true,
      data: trajet,
      debug: {
        foundWith: trajet ? 'One of the methods worked' : 'None worked',
        searchedId: id
      }
    });

  } catch (error) {
    console.error('Error fetching traject:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    res.status(500).json({
      message: 'Internal server error while fetching trajet',
      error: error.message,
      searchedId: req.params.id
    });
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

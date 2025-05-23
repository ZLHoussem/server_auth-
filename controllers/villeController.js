const Ville = require('../models/Ville');

exports.addVille = async (req, res) => {
  try {
    const { name, payer } = req.body;
    if (!name || !payer) {
      return res.status(400).json({ message: 'Name and payer are required' });
    }
    const ville = new Ville({ name, payer });
    await ville.save();
    res.status(201).json({ message: 'Ville added successfully', ville });
  } catch (error) {
    res.status(500).json({ message: 'Error adding ville', error: error.message });
  }
};

exports.deleteVille = async (req, res) => {
  try {
    const { id } = req.params;
    const ville = await Ville.findByIdAndDelete(id);
    if (!ville) {
      return res.status(404).json({ message: 'Ville not found' });
    }
    res.status(200).json({ message: 'Ville deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ville', error: error.message });
  }
};
// Updated API endpoint to support letter-based search
exports.getVilles = async (req, res) => {
  try {
    const { filters, populate } = req.query;
    let query = {};
    
    // Handle filters[name][$contains] for case-insensitive substring search
    if (filters && filters.name && filters.name['$contains']) {
      const keyword = filters.name['$contains'];
      
      // Check if it's a single letter search
      if (keyword.length === 1) {
        // Search for cities that start with the letter
        query.name = { $regex: `^${keyword}`, $options: 'i' };
      } else {
        // Regular substring search for longer keywords
        query.name = { $regex: keyword, $options: 'i' };
      }
    }
    
    // Alternative: Handle a dedicated letter parameter
    if (req.query.letter) {
      const letter = req.query.letter;
      if (letter.length === 1) {
        query.name = { $regex: `^${letter}`, $options: 'i' };
      }
    }
    
    // Handle populate=* (return all fields, which is default in Mongoose)
    const villes = await Ville.find(query);
    
    res.status(200).json({
      message: 'Villes retrieved successfully',
      data: villes,
      count: villes.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving villes', 
      error: error.message 
    });
  }
};
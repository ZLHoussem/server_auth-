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

exports.getVilles = async (req, res) => {
  try {
    const { filters, populate } = req.query;
    let query = {};

    // Handle filters[name][$contains] for case-insensitive substring search
    if (filters && filters.name && filters.name['$contains']) {
      const keyword = filters.name['$contains'];
      query.name = { $regex: keyword, $options: 'i' }; // Case-insensitive search
    }

    // Handle populate=* (return all fields, which is default in Mongoose)
    // Since Mongoose returns all fields by default, we only need to query
    const villes = await Ville.find(query);

    res.status(200).json({
      message: 'Villes retrieved successfully',
      data: villes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving villes', error: error.message });
  }
};
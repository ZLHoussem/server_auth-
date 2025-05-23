//===== server.js =====
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dbConfig = require('./config/db');
const authuserRoutes = require('./routes/authUser');
const userRoutes = require('./routes/user');
const authdriverRoutes = require('./routes/authDriver');
const DriverRoutes = require('./routes/driver');
const trajectRoutes = require('./routes/trajectRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Connect to MongoDB
mongoose.connect(dbConfig.url)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
  })
  .catch(err => {
    console.error('Connection error', err);
    process.exit();
  });

// Routes
app.use('/api/auth', authuserRoutes);
app.use('/api/user', userRoutes);
app.use('/api/authdriver', authdriverRoutes);
app.use('/api/driver', DriverRoutes);
app.use('/api/trajets', trajectRoutes);


// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the authentication API.' });
});

// Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
console.log('Server port:', process.env.PORT);
console.log('MongoDB URI is configured:', !!process.env.MONGODB_URI);
console.log('JWT Secret is configured:', !!process.env.JWT_SECRET);
console.log('Email configuration is set up:', !!process.env.EMAIL_USER);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DriverSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
phoneNumber: {
    type: String,
    trim: true,
    sparse: true, // Allows multiple documents to have no value for this field
    index: true // Add index for faster queries
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    default: null
  },
  verificationCodeExpires: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  },
   resetPasswordCode: {
    type: String,
    default: undefined
  },
  roles: {
    type: [String],
    default: ['user']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to hash password
DriverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
DriverSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Driver = mongoose.model('Driver', DriverSchema);
module.exports = Driver;

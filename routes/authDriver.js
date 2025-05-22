const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Driver = require('../models/Driver');
const config = require('../config/config');
const nodemailer = require('nodemailer');
const router = express.Router();
// Helper function to send email
const sendEmail = async (options) => {
  // Setup email transporter
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });

  // Send email
  await transporter.sendMail({
    from: config.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });
};

// Generate random numeric code
const generateVerificationCode = (length) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

// Register a new Driver
router.post('/signup', async (req, res) => {
  try {
    // Validate request
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check for existing user
    const existingUser = await Driver.findOne({
      $or: [
        { email: req.body.email },
        { username: req.body.username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    
    // Create new user
    const driver = new Driver({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      phoneNumber: req.body.phoneNumber,
      roles: req.body.roles || ['user'],
      verificationCode: verificationCode,
      verificationCodeExpires: Date.now() + config.verificationCodeExpiry
    });

    // Save user
    await driver.save();

    // Send verification email
    await sendEmail({
      to: driver.email,
      subject: 'Email Verification',
      text: `Your verification code is: ${verificationCode}. It will expire in 1 hour.`,
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>It will expire in 1 hour.</p>
      `
    });

    res.status(201).json({ 
      message: 'User registered successfully! Please check your email for verification code.',
      userId: driver._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Login Driver
router.post('/signin', async (req, res) => {
  try {
    // Find Driver by email
    const driver = await Driver.findOne({ email: req.body.email });
    
    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const passwordIsValid = await driver.comparePassword(req.body.password);
    
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if driver email is verified
    if (!driver.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        userId: driver._id
      });
    }

    // Create token
    const token = jwt.sign(
      { id: driver._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

    // Return driver info & token
    res.status(200).json({
      id: driver._id,
      username: driver.username,
      email: driver.email,
      roles: driver.roles,
      accessToken: token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Verify email with code
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;

    if (!userId || !verificationCode) {
      return res.status(400).json({ message: 'User ID and verification code are required' });
    }

    // Find driver by ID
    const driver = await Driver.findById(userId);

    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if Driver is already verified
    if (driver.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check if verification code is valid and not expired
    if (
      driver.verificationCode !== verificationCode ||
      driver.verificationCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Update Driver as verified
    driver.isVerified = true;
    driver.verificationCode = null;
    driver.verificationCodeExpires = null;
    await driver.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const driver = await Driver.findOne({ email });

    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if driver is already verified
    if (driver.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    
    // Update driver with new verification code
    driver.verificationCode = verificationCode;
    driver.verificationCodeExpires = Date.now() + config.verificationCodeExpiry;
    await driver.save();

    // Send verification email
    await sendEmail({
      to: driver.email,
      subject: 'Email Verification Code (Resent)',
      text: `Your verification code is: ${verificationCode}. It will expire in 1 hour.`,
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>It will expire in 1 hour.</p>
      `
    });

    res.status(200).json({ 
      message: 'Verification code resent successfully! Please check your email.',
      userId: driver._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const Driver = await Driver.findOne({ email });
    
    if (!Driver) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiry on Driver document
    Driver.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    Driver.resetPasswordExpires = Date.now() + config.resetPasswordExpiry;
    
    await Driver.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    // Create email message
    const message = `You requested a password reset. Please click on the following link to reset your password: \n\n ${resetUrl} \n\n If you didn't request this, please ignore this email.`;

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        Driver: config.email.auth.Driver,
        pass: config.email.auth.pass
      }
    });

    // Send email
    await transporter.sendMail({
      from: config.email.from,
      to: Driver.email,
      subject: 'Password Reset Request',
      text: message
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    Driver.resetPasswordToken = undefined;
    Driver.resetPasswordExpires = undefined;
    await Driver.save();
    
    res.status(500).json({ message: 'Could not send reset email' });
  }
});
//==================================================================================================
// Reset password - validate token and set new password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Hash the token from URL
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find Driver with token and valid expiry
    const Driver = await Driver.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!Driver) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password and clear reset token fields
    Driver.password = password;
    Driver.resetPasswordToken = undefined;
    Driver.resetPasswordExpires = undefined;
    
    await Driver.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Could not reset password' });
  }
});
//==================================================================================================
// Validate reset token without setting a new password
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Hash the token from URL
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find Driver with token and valid expiry
    const Driver = await Driver.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!Driver) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ message: 'Could not validate token' });
  }
});

module.exports = router;

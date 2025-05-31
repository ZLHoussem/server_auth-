const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
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

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    // Validate request
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check for existing user
    const existingUser = await User.findOne({
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
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      phoneNumber: req.body.phoneNumber,
      roles: req.body.roles || ['user'],
      verificationCode: verificationCode,
      verificationCodeExpires: Date.now() + config.verificationCodeExpiry
    });

    // Save user
    await user.save();

    // Send verification email
    await sendEmail({
      to: user.email,
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
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Login user
router.post('/signin', async (req, res) => {
  try {
    // Find user by email
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const passwordIsValid = await user.comparePassword(req.body.password);
    
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if user email is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        userId: user._id
      });
    }
 // Update FCM token if provided in the request
    if (req.body.fcmToken) {
      user.fcmToken = req.body.fcmToken;
      await user.save();
    }
    // Create token
    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

    // Return user info & token
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
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

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check if verification code is valid and not expired
    if (
      user.verificationCode !== verificationCode ||
      user.verificationCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Update user as verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

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

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    
    // Update user with new verification code
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + config.verificationCodeExpiry;
    await user.save();

    // Send verification email
    await sendEmail({
      to: user.email,
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
      userId: user._id
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

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiry on user document
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + config.resetPasswordExpiry;
    
    await user.save();

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
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });

    // Send email
    await transporter.sendMail({
      from: config.email.from,
      to: user.email,
      subject: 'Password Reset Request',
      text: message
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
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

    // Find user with token and valid expiry
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password and clear reset token fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

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

    // Find user with token and valid expiry
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ message: 'Could not validate token' });
  }
});

module.exports = router;

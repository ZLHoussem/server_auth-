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
      phoneNumber:user.phoneNumber,
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
//===================================================================================
router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate 6-digit verification code
    const resetCode = generateVerificationCode(6);
    
    // Set code and expiry on Driver document (expires in 15 minutes)
    User.resetPasswordCode = resetCode;
    User.resetPasswordExpires = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    await User.save();

    // Send email with verification code
    await sendEmail({
      to: User.email,
      subject: 'Password Reset Verification Code',
      text: `Your password reset verification code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Verification</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 3px;">${resetCode}</h1>
          </div>
          <p style="color: #666; text-align: center;">
            Enter this 6-digit code in the app to reset your password.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            This code will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    });

    res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Send reset code error:', error);
    
    // Clean up on error
    if (error.user) {
      error.user.resetPasswordCode = undefined;
      error.user.resetPasswordExpires = undefined;
      await error.user.save();
    }
    
    res.status(500).json({ message: 'Could not send verification code' });
  }
});
router.post('/reset-password-with-code', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        message: 'Email, verification code, and new password are required' 
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Find driver with matching email and code
    const driver = await Driver.findOne({ 
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!driver) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification code' 
      });
    }

    // Set new password and clear reset fields
    driver.password = newPassword; // This will be hashed by the pre-save hook in your model
    driver.resetPasswordCode = undefined;
    driver.resetPasswordExpires = undefined;
    
    await driver.save();

    // Send confirmation email
    await sendEmail({
      to: driver.email,
      subject: 'Password Reset Successful',
      text: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745; text-align: center;">Password Reset Successful</h2>
          <p style="color: #333; text-align: center;">
            Your password has been successfully reset.
          </p>
          <p style="color: #666; text-align: center;">
            You can now log in with your new password.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you did not make this change, please contact support immediately.
          </p>
        </div>
      `
    });

    res.status(200).json({ 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password with code error:', error);
    res.status(500).json({ message: 'Could not reset password' });
  }
});
//====================================================
router.put('/:id/update-profile',  async (req, res) => {
  try {
    const { username, email, phoneNumber } = req.body;
    const userId = req.params.id; // From URL parameter

    // Ensure the authenticated user is updating their own profile
    // This assumes an authentication middleware populates req.user
    if (req.user && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only update your own profile.'
      });
    }

    // Validate that at least one field is provided
    if (!username && !email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update.'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prepare update object
    const updateData = {};
    
    // Validate and add username if provided
    if (username && username.trim()) {
      // Check if username already exists (excluding current user)
      const existingUser = await User.findOne({ 
        username: username.trim(), 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists.'
        });
      }
      
      updateData.username = username.trim();
    }

    // Validate and add email if provided
    if (email && email.trim()) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.'
        });
      }

      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ 
        email: email.trim().toLowerCase(), 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists.'
        });
      }
      
      updateData.email = email.trim().toLowerCase();
      // Reset email verification if email is changed
      updateData.isVerified = false;
    }

    // Validate and add phone number if provided
    if (phoneNumber && phoneNumber.trim()) {
      // Basic phone number validation (adjust regex as needed)
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format.'
        });
      }
      
      updateData.phoneNumber = phoneNumber.trim();
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from response

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile.'
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        isVerified: updatedUser.isVerified,
        roles: updatedUser.roles,
        fcmToken: updatedUser.fcmToken
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});


module.exports = router;

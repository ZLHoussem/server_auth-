module.exports = {
    url: process.env.MONGODB_URI || 'mongodb://admin:admin123@82.112.242.233:27017/bladigo?authSource=admin'
  
  };
  
  // ===== config/config.js =====
  module.exports = {
  IMAGE_SERVER_URL: process.env.IMAGE_SERVER_URL || 'http://m4ckwwswggwo8c8g08gwsscc.82.112.242.233.sslip.io/uploads/upload',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiration: 86400, // 24 hours (in seconds)
    email: {
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true' || false,
      auth: {
        user: process.env.EMAIL_USER || 'user@example.com',
        pass: process.env.EMAIL_PASSWORD || 'password'
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com'
    },
    resetPasswordExpiry: 3600000, // 1 hour (in milliseconds)
    verificationCodeExpiry: 3600000, // 1 hour (in milliseconds)
    verificationCodeLength: 6 // Length of verification code
  };
  
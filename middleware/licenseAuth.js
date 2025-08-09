const licenseService = require('../services/licenseService');

// Middleware to check if the bot is properly licensed
const requireLicense = async (req, res, next) => {
  try {
    // Skip license check for license-related routes
    if (req.path.startsWith('/api/license')) {
      return next();
    }

    // Skip license check for health check and basic info routes
    if (req.path === '/api/health' || req.path === '/api/info') {
      return next();
    }

    // Allow basic data routes for UI functionality
    if (req.path === '/api/pairs' || req.path === '/api/timeframes') {
      return next();
    }

    // Allow historical data for charts (but limit functionality)
    if (req.path.startsWith('/api/pairs/') && req.path.includes('/historical')) {
      return next();
    }

    // Allow stats, signals, and alerts routes for UI functionality
    if (req.path.startsWith('/api/stats') || req.path.startsWith('/api/signals') || req.path.startsWith('/api/alerts')) {
      return next();
    }

    // Check if bot is licensed
    const isLicensed = await licenseService.isBotLicensed();
    
    if (!isLicensed) {
      return res.status(403).json({
        error: 'License Required',
        message: 'This bot requires a valid license key to operate. Please activate your license.',
        code: 'LICENSE_REQUIRED'
      });
    }

    // License is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('License authentication error:', error);
    res.status(500).json({
      error: 'License Verification Error',
      message: 'Unable to verify license status. Please try again.',
      code: 'LICENSE_VERIFICATION_ERROR'
    });
  }
};

// Middleware to check license status and add to request object
const checkLicenseStatus = async (req, res, next) => {
  try {
    const licenseStatus = await licenseService.getLicenseStatus();
    req.licenseStatus = licenseStatus;
    next();
  } catch (error) {
    console.error('Error checking license status:', error);
    req.licenseStatus = {
      hasLicense: false,
      valid: false,
      status: 'Error checking license'
    };
    next();
  }
};

// Middleware for admin routes that require license verification
const requireValidLicense = async (req, res, next) => {
  try {
    const validation = await licenseService.validateLicense(true); // Force online check
    
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Invalid License',
        message: validation.message,
        code: 'INVALID_LICENSE'
      });
    }

    req.license = validation.license;
    next();
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({
      error: 'License Validation Error',
      message: 'Unable to validate license. Please try again.',
      code: 'LICENSE_VALIDATION_ERROR'
    });
  }
};

// Startup license check function
const performStartupLicenseCheck = async () => {
  try {
    console.log('🔐 Performing startup license check...');
    
    const validation = await licenseService.validateLicense();
    
    if (!validation.valid) {
      console.log('❌ License validation failed:', validation.message);
      
      if (validation.requiresActivation) {
        console.log('📝 Bot requires license activation.');
        console.log('💡 Please access the web interface to enter your license key.');
      }
      
      return {
        success: false,
        message: validation.message,
        requiresActivation: validation.requiresActivation
      };
    }
    
    console.log('✅ License validation successful!');
    console.log(`📧 Licensed to: ${validation.license?.user_email || 'Unknown'}`);
    
    return {
      success: true,
      message: 'License is valid',
      license: validation.license
    };
  } catch (error) {
    console.error('❌ Startup license check failed:', error);
    return {
      success: false,
      message: 'Error during license check'
    };
  }
};

// Function to initialize license system
const initializeLicenseSystem = async () => {
  try {
    console.log('🚀 Initializing license system...');
    
    // Connect to license database
    const connected = await licenseService.connectToDatabase();
    if (!connected) {
      console.error('❌ Failed to connect to license database');
      return false;
    }
    
    console.log('✅ License system initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize license system:', error);
    return false;
  }
};

// Express middleware to handle license errors gracefully
const licenseErrorHandler = (err, req, res, next) => {
  if (err.code === 'LICENSE_REQUIRED' || err.code === 'INVALID_LICENSE') {
    return res.status(403).json({
      error: err.message,
      code: err.code,
      requiresActivation: true
    });
  }
  
  if (err.code === 'LICENSE_VERIFICATION_ERROR') {
    return res.status(500).json({
      error: 'License verification failed',
      message: 'Please check your internet connection and try again',
      code: err.code
    });
  }
  
  next(err);
};

// Function to check if license is required for a specific route
const isLicenseRequiredForRoute = (path) => {
  const publicRoutes = [
    '/api/license',
    '/api/health',
    '/api/info',
    '/api/pairs',
    '/api/timeframes',
    '/api/stats',
    '/api/signals',
    '/api/alerts',
    '/favicon.ico'
  ];
  
  // Also allow historical data routes
  if (path.includes('/historical')) {
    return false;
  }
  
  return !publicRoutes.some(route => path.startsWith(route));
};

module.exports = {
  requireLicense,
  checkLicenseStatus,
  requireValidLicense,
  performStartupLicenseCheck,
  initializeLicenseSystem,
  licenseErrorHandler,
  isLicenseRequiredForRoute
};
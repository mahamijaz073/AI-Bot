const express = require('express');
const router = express.Router();
const licenseService = require('../services/licenseService');
const LicenseKey = require('../models/LicenseKey');

// Middleware to check if request is from admin (simple implementation)
const isAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey === process.env.ADMIN_KEY || adminKey === 'admin-secret-key-2024') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get license status
router.get('/status', async (req, res) => {
  try {
    const status = await licenseService.getLicenseStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting license status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify license key
router.post('/verify', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        valid: false, 
        message: 'License key is required' 
      });
    }

    const result = await licenseService.verifyLicenseOnline(licenseKey);
    res.json(result);
  } catch (error) {
    console.error('Error verifying license:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Internal server error during verification' 
    });
  }
});

// Activate license
router.post('/activate', async (req, res) => {
  try {
    const { licenseKey, userEmail } = req.body;
    console.log('🔐 License activation attempt:', { licenseKey, userEmail });
    
    if (!licenseKey) {
      console.log('❌ No license key provided');
      return res.status(400).json({ 
        success: false, 
        message: 'License key is required' 
      });
    }

    console.log('🔍 Verifying license key:', licenseKey);
    const result = await licenseService.activateLicense(licenseKey, userEmail);
    console.log('📋 Activation result:', result);
    
    if (result.success) {
      console.log('✅ License activated successfully');
      res.json(result);
    } else {
      console.log('❌ License activation failed:', result.message);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error activating license:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during activation' 
    });
  }
});

// Validate current license
router.post('/validate', async (req, res) => {
  try {
    const { forceOnlineCheck } = req.body;
    const result = await licenseService.validateLicense(forceOnlineCheck);
    res.json(result);
  } catch (error) {
    console.error('Error validating license:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Internal server error during validation' 
    });
  }
});

// Remove local license
router.delete('/local', async (req, res) => {
  try {
    const removed = licenseService.removeLicenseLocally();
    if (removed) {
      res.json({ success: true, message: 'Local license removed successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to remove local license' });
    }
  } catch (error) {
    console.error('Error removing local license:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin Routes

// Create new license (Admin only)
router.post('/admin/create', isAdmin, async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'User email is required' 
      });
    }

    const result = await licenseService.createLicense(userEmail);
    res.json(result);
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during license creation' 
    });
  }
});

// Deactivate license (Admin only)
router.post('/admin/deactivate', isAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'License key is required' 
      });
    }

    const result = await licenseService.deactivateLicense(licenseKey);
    res.json(result);
  } catch (error) {
    console.error('Error deactivating license:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during deactivation' 
    });
  }
});

// Get all licenses (Admin only)
router.get('/admin/all', isAdmin, async (req, res) => {
  try {
    await licenseService.connectToDatabase();
    const licenses = await LicenseKey.find({}).sort({ created_at: -1 });
    res.json({ success: true, licenses });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update license status (Admin only)
router.put('/admin/:licenseKey/status', isAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { status } = req.body;
    
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be "active" or "disabled"' 
      });
    }

    await licenseService.connectToDatabase();
    const license = await LicenseKey.findOne({ key: licenseKey.toUpperCase() });
    
    if (!license) {
      return res.status(404).json({ 
        success: false, 
        message: 'License key not found' 
      });
    }

    license.status = status;
    await license.save();
    
    res.json({ 
      success: true, 
      message: `License ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      license 
    });
  } catch (error) {
    console.error('Error updating license status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get license details (Admin only)
router.get('/admin/:licenseKey', isAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.params;
    
    await licenseService.connectToDatabase();
    const license = await LicenseKey.findOne({ key: licenseKey.toUpperCase() });
    
    if (!license) {
      return res.status(404).json({ 
        success: false, 
        message: 'License key not found' 
      });
    }

    res.json({ success: true, license });
  } catch (error) {
    console.error('Error fetching license details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Generate multiple licenses (Admin only)
router.post('/admin/bulk-create', isAdmin, async (req, res) => {
  try {
    const { count, userEmail } = req.body;
    
    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Count must be between 1 and 100' 
      });
    }

    if (!userEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'User email is required' 
      });
    }

    await licenseService.connectToDatabase();
    const licenses = [];
    
    for (let i = 0; i < count; i++) {
      const licenseKey = LicenseKey.generateKey();
      const newLicense = new LicenseKey({
        key: licenseKey,
        user_email: userEmail,
        status: 'active'
      });
      
      await newLicense.save();
      licenses.push(licenseKey);
    }

    res.json({ 
      success: true, 
      message: `${count} licenses created successfully`,
      licenses 
    });
  } catch (error) {
    console.error('Error creating bulk licenses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during bulk creation' 
    });
  }
});

module.exports = router;
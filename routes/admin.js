const express = require('express');
const router = express.Router();
const LicenseKey = require('../models/LicenseKey');
const { requireValidLicense } = require('../middleware/licenseAuth');

// Admin authentication middleware (simple password protection)
const adminAuth = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'] || req.query.password;
  
  if (providedPassword !== adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin password required'
    });
  }
  
  next();
};

// Apply admin authentication to all routes
router.use(adminAuth);

// Generate a new license key
router.post('/license-keys/generate', async (req, res) => {
  try {
    const { user_email, user_name, expires_in_days, notes } = req.body;
    
    // Generate unique key
    let key;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      key = LicenseKey.generateKey();
      const existing = await LicenseKey.findOne({ key });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return res.status(500).json({
        error: 'Key Generation Failed',
        message: 'Unable to generate unique key after 10 attempts'
      });
    }
    
    // Create license key document
    const licenseKeyData = {
      key,
      user_email: user_email || null,
      user_name: user_name || null,
      notes: notes || null
    };
    
    // Set expiration if specified
    if (expires_in_days && expires_in_days > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
      licenseKeyData.expires_at = expirationDate;
    }
    
    const licenseKey = new LicenseKey(licenseKeyData);
    await licenseKey.save();
    
    res.status(201).json({
      success: true,
      message: 'License key generated successfully',
      data: licenseKey
    });
    
  } catch (error) {
    console.error('Error generating license key:', error);
    res.status(500).json({
      error: 'Generation Error',
      message: error.message
    });
  }
});

// Get all license keys
router.get('/license-keys', async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { key: { $regex: search, $options: 'i' } },
        { user_email: { $regex: search, $options: 'i' } },
        { user_name: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [keys, total] = await Promise.all([
      LicenseKey.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LicenseKey.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: keys,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching license keys:', error);
    res.status(500).json({
      error: 'Fetch Error',
      message: error.message
    });
  }
});

// Get license key by ID
router.get('/license-keys/:id', async (req, res) => {
  try {
    const licenseKey = await LicenseKey.findById(req.params.id);
    
    if (!licenseKey) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'License key not found'
      });
    }
    
    res.json({
      success: true,
      data: licenseKey
    });
    
  } catch (error) {
    console.error('Error fetching license key:', error);
    res.status(500).json({
      error: 'Fetch Error',
      message: error.message
    });
  }
});

// Update license key status
router.patch('/license-keys/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'disabled', 'expired'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Status must be active, disabled, or expired'
      });
    }
    
    const licenseKey = await LicenseKey.findByIdAndUpdate(
      req.params.id,
      { status, updated_at: new Date() },
      { new: true }
    );
    
    if (!licenseKey) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'License key not found'
      });
    }
    
    res.json({
      success: true,
      message: `License key ${status === 'active' ? 'activated' : status === 'disabled' ? 'disabled' : 'expired'}`,
      data: licenseKey
    });
    
  } catch (error) {
    console.error('Error updating license key status:', error);
    res.status(500).json({
      error: 'Update Error',
      message: error.message
    });
  }
});

// Update license key details
router.patch('/license-keys/:id', async (req, res) => {
  try {
    const { user_email, user_name, notes, expires_in_days } = req.body;
    
    const updateData = {
      updated_at: new Date()
    };
    
    if (user_email !== undefined) updateData.user_email = user_email;
    if (user_name !== undefined) updateData.user_name = user_name;
    if (notes !== undefined) updateData.notes = notes;
    
    // Handle expiration
    if (expires_in_days !== undefined) {
      if (expires_in_days === null || expires_in_days === 0) {
        updateData.expires_at = null;
      } else {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
        updateData.expires_at = expirationDate;
      }
    }
    
    const licenseKey = await LicenseKey.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!licenseKey) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'License key not found'
      });
    }
    
    res.json({
      success: true,
      message: 'License key updated successfully',
      data: licenseKey
    });
    
  } catch (error) {
    console.error('Error updating license key:', error);
    res.status(500).json({
      error: 'Update Error',
      message: error.message
    });
  }
});

// Delete license key
router.delete('/license-keys/:id', async (req, res) => {
  try {
    const licenseKey = await LicenseKey.findByIdAndDelete(req.params.id);
    
    if (!licenseKey) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'License key not found'
      });
    }
    
    res.json({
      success: true,
      message: 'License key deleted successfully',
      data: licenseKey
    });
    
  } catch (error) {
    console.error('Error deleting license key:', error);
    res.status(500).json({
      error: 'Delete Error',
      message: error.message
    });
  }
});

// Get license key statistics
router.get('/stats/license-keys', async (req, res) => {
  try {
    const [total, active, disabled, expired] = await Promise.all([
      LicenseKey.countDocuments(),
      LicenseKey.countDocuments({ status: 'active' }),
      LicenseKey.countDocuments({ status: 'disabled' }),
      LicenseKey.countDocuments({ status: 'expired' })
    ]);
    
    // Get recent activity
    const recentKeys = await LicenseKey.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('key user_email status created_at');
    
    res.json({
      success: true,
      data: {
        total,
        active,
        disabled,
        expired,
        recent: recentKeys
      }
    });
    
  } catch (error) {
    console.error('Error fetching license key stats:', error);
    res.status(500).json({
      error: 'Stats Error',
      message: error.message
    });
  }
});

module.exports = router;
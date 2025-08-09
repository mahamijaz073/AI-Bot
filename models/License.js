const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  user_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  activated_at: {
    type: Date
  },
  last_used: {
    type: Date
  },
  device_info: {
    type: String
  },
  usage_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
licenseSchema.index({ key: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ user_email: 1 });

// Method to check if license is valid
licenseSchema.methods.isValid = function() {
  return this.status === 'active';
};

// Method to activate license
licenseSchema.methods.activate = function() {
  this.status = 'active';
  this.activated_at = new Date();
  return this.save();
};

// Method to deactivate license
licenseSchema.methods.deactivate = function() {
  this.status = 'disabled';
  return this.save();
};

// Method to update usage
licenseSchema.methods.updateUsage = function(deviceInfo) {
  this.last_used = new Date();
  this.usage_count += 1;
  if (deviceInfo) {
    this.device_info = deviceInfo;
  }
  return this.save();
};

// Static method to verify license key
licenseSchema.statics.verifyKey = async function(key) {
  try {
    const license = await this.findOne({ key: key.toUpperCase() });
    if (!license) {
      return { valid: false, message: 'License key not found' };
    }
    
    if (!license.isValid()) {
      return { valid: false, message: 'License key is disabled' };
    }
    
    // Update usage
    await license.updateUsage();
    
    return { 
      valid: true, 
      message: 'License key is valid',
      license: license
    };
  } catch (error) {
    return { valid: false, message: 'Error verifying license key' };
  }
};

// Static method to generate a new license key
licenseSchema.statics.generateKey = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 3; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return segments.join('-');
};

module.exports = mongoose.model('License', licenseSchema);
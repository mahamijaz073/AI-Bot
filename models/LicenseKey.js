const mongoose = require('mongoose');

const licenseKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'expired'],
    default: 'active'
  },
  user_email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  user_name: {
    type: String,
    required: false,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: false
  },
  last_used: {
    type: Date,
    required: false
  },
  usage_count: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Update the updated_at field before saving
licenseKeySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method to generate a random key string
licenseKeySchema.statics.generateKeyString = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  
  // Generate 3 segments of 3 characters each
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 3; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `MDN-${segments.join('-')}`;
};

// Static method to generate and save a new license key
licenseKeySchema.statics.generateKey = async function(options = {}) {
  const keyString = this.generateKeyString();
  
  const licenseKeyData = {
    key: keyString,
    status: 'active',
    user_email: options.user_email || null,
    user_name: options.user_name || null,
    notes: options.notes || null
  };
  
  if (options.expires_at) {
    licenseKeyData.expires_at = options.expires_at;
  }
  
  const licenseKey = new this(licenseKeyData);
  return await licenseKey.save();
};

// Static method to get statistics
licenseKeySchema.statics.getStatistics = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ status: 'active' });
  const disabled = await this.countDocuments({ status: 'disabled' });
  const expired = await this.countDocuments({ 
    $or: [
      { status: 'expired' },
      { expires_at: { $lt: new Date() } }
    ]
  });
  
  return { total, active, disabled, expired };
};

// Instance method to check if key is valid
licenseKeySchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  if (this.expires_at && this.expires_at < new Date()) return false;
  return true;
};

// Instance method to mark as used
licenseKeySchema.methods.markAsUsed = function() {
  this.last_used = new Date();
  this.usage_count += 1;
  return this.save();
};

module.exports = mongoose.model('LicenseKey', licenseKeySchema);
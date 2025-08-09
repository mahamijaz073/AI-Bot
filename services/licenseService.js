const mongoose = require('mongoose');
const License = require('../models/License');
const LicenseKey = require('../models/LicenseKey');
const fs = require('fs');
const path = require('path');
const os = require('os');

class LicenseService {
  constructor() {
    this.isConnected = false;
    this.licenseConfigPath = path.join(__dirname, '..', 'config', 'license.json');
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-signals';
  }

  // Connect to MongoDB Atlas using separate connection
  async connectToDatabase() {
    try {
      if (this.isConnected) {
        return true;
      }

      // Create a separate connection for license database
      this.licenseConnection = mongoose.createConnection(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      // Wait for connection to be established
      await new Promise((resolve, reject) => {
        this.licenseConnection.once('open', resolve);
        this.licenseConnection.once('error', reject);
      });

      this.isConnected = true;
      console.log('✅ Connected to MongoDB Atlas for license verification');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to license database:', error.message);
      return false;
    }
  }

  // Verify license key online
  async verifyLicenseOnline(licenseKey) {
    try {
      console.log('🔍 Starting license verification for:', licenseKey);
      const connected = await this.connectToDatabase();
      if (!connected) {
        console.log('❌ Database connection failed');
        return {
          valid: false,
          message: 'Unable to connect to license server'
        };
      }

      // Use the separate connection for license operations
      const LicenseKeyModel = this.licenseConnection.model('LicenseKey', LicenseKey.schema);
      console.log('🔍 Searching for license key in database:', licenseKey);
      const license = await LicenseKeyModel.findOne({ key: licenseKey });
      console.log('📋 Database query result:', license ? 'Found' : 'Not found');
      
      if (!license) {
        console.log('❌ License key not found in database');
        return {
          valid: false,
          message: 'Invalid license key'
        };
      }

      console.log('📋 License found - Status:', license.status);
      if (license.status !== 'active') {
        console.log('❌ License status is not active:', license.status);
        return {
          valid: false,
          message: 'License key is not active'
        };
      }

      // Update last usage
      console.log('✅ License is valid, updating usage stats');
      license.last_used = new Date();
      license.usage_count += 1;
      await license.save();

      return {
        valid: true,
        message: 'License is valid',
        license: {
          key: license.key,
          status: license.status,
          user_email: license.user_email,
          created_at: license.created_at,
          activated_at: license.activated_at
        }
      };
    } catch (error) {
      console.error('License verification error:', error);
      return {
        valid: false,
        message: 'Error during license verification'
      };
    }
  }

  // Save license key locally after successful verification
  async saveLicenseLocally(licenseKey, licenseData) {
    try {
      const configDir = path.dirname(this.licenseConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const licenseConfig = {
        key: licenseKey,
        verified_at: new Date().toISOString(),
        device_id: this.getDeviceId(),
        user_email: licenseData.user_email,
        status: licenseData.status
      };

      fs.writeFileSync(this.licenseConfigPath, JSON.stringify(licenseConfig, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving license locally:', error);
      return false;
    }
  }

  // Load license key from local storage
  loadLicenseLocally() {
    try {
      if (!fs.existsSync(this.licenseConfigPath)) {
        return null;
      }

      const configData = fs.readFileSync(this.licenseConfigPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading local license:', error);
      return null;
    }
  }

  // Get unique device identifier
  getDeviceId() {
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    return `${hostname}-${platform}-${arch}`;
  }

  // Validate license (check both local and online)
  async validateLicense(forceOnlineCheck = false) {
    try {
      // Load local license first
      const localLicense = this.loadLicenseLocally();
      
      if (!localLicense && !forceOnlineCheck) {
        return {
          valid: false,
          message: 'No license key found. Please enter your license key.',
          requiresActivation: true
        };
      }

      // If we have a local license and not forcing online check, validate locally first
      if (localLicense && !forceOnlineCheck) {
        // Check if license was verified recently (within 24 hours)
        const verifiedAt = new Date(localLicense.verified_at);
        const now = new Date();
        const hoursSinceVerification = (now - verifiedAt) / (1000 * 60 * 60);
        
        if (hoursSinceVerification < 24) {
          return {
            valid: true,
            message: 'License is valid (cached)',
            license: localLicense
          };
        }
      }

      // Perform online verification
      const licenseKey = localLicense ? localLicense.key : null;
      if (!licenseKey) {
        return {
          valid: false,
          message: 'No license key available for verification',
          requiresActivation: true
        };
      }

      const onlineResult = await this.verifyLicenseOnline(licenseKey);
      
      if (onlineResult.valid) {
        // Update local license with fresh verification
        await this.saveLicenseLocally(licenseKey, onlineResult.license);
      } else {
        // Remove invalid local license
        this.removeLicenseLocally();
      }

      return onlineResult;
    } catch (error) {
      console.error('License validation error:', error);
      return {
        valid: false,
        message: 'Error during license validation'
      };
    }
  }

  // Activate license with a new key
  async activateLicense(licenseKey, userEmail) {
    try {
      const result = await this.verifyLicenseOnline(licenseKey);
      
      if (result.valid) {
        const saved = await this.saveLicenseLocally(licenseKey, result.license);
        if (saved) {
          return {
            success: true,
            message: 'License activated successfully!'
          };
        } else {
          return {
            success: false,
            message: 'License verified but failed to save locally'
          };
        }
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error('License activation error:', error);
      return {
        success: false,
        message: 'Error during license activation'
      };
    }
  }

  // Remove local license file
  removeLicenseLocally() {
    try {
      if (fs.existsSync(this.licenseConfigPath)) {
        fs.unlinkSync(this.licenseConfigPath);
      }
      return true;
    } catch (error) {
      console.error('Error removing local license:', error);
      return false;
    }
  }

  // Check if bot is licensed
  async isBotLicensed() {
    const validation = await this.validateLicense();
    return validation.valid;
  }

  // Get license status
  async getLicenseStatus() {
    const localLicense = this.loadLicenseLocally();
    if (!localLicense) {
      return {
        hasLicense: false,
        status: 'No license found'
      };
    }

    const validation = await this.validateLicense();
    return {
      hasLicense: true,
      valid: validation.valid,
      key: localLicense.key,
      status: validation.message,
      verified_at: localLicense.verified_at,
      user_email: localLicense.user_email
    };
  }

  // Create a new license (admin function)
  async createLicense(userEmail) {
    try {
      const connected = await this.connectToDatabase();
      if (!connected) {
        throw new Error('Unable to connect to database');
      }

      const LicenseKeyModel = this.licenseConnection.model('LicenseKey', LicenseKey.schema);
      const result = await LicenseKeyModel.generateKey({
        user_email: userEmail,
        status: 'active'
      });
      const licenseKey = result.key;
      return {
        success: true,
        licenseKey: licenseKey,
        message: 'License created successfully'
      };
    } catch (error) {
      console.error('Error creating license:', error);
      return {
        success: false,
        message: 'Error creating license: ' + error.message
      };
    }
  }

  // Deactivate license (admin function)
  async deactivateLicense(licenseKey) {
    try {
      const connected = await this.connectToDatabase();
      if (!connected) {
        throw new Error('Unable to connect to database');
      }

      const LicenseKeyModel = this.licenseConnection.model('LicenseKey', LicenseKey.schema);
      const license = await LicenseKeyModel.findOne({ key: licenseKey.toUpperCase() });
      if (!license) {
        return {
          success: false,
          message: 'License key not found'
        };
      }

      license.status = 'disabled';
      license.updated_at = new Date();
      await license.save();
      return {
        success: true,
        message: 'License deactivated successfully'
      };
    } catch (error) {
      console.error('Error deactivating license:', error);
      return {
        success: false,
        message: 'Error deactivating license: ' + error.message
      };
    }
  }
}

module.exports = new LicenseService();
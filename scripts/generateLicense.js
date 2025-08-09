#!/usr/bin/env node

/**
 * License Key Generator CLI Tool
 * MD ADNAN MUGHAL BOT - Command Line Interface
 * 
 * Usage:
 *   node scripts/generateLicense.js
 *   node scripts/generateLicense.js --email user@example.com --name "John Doe" --days 365
 *   node scripts/generateLicense.js --list
 *   node scripts/generateLicense.js --disable KEY-123-ABC
 *   node scripts/generateLicense.js --enable KEY-123-ABC
 *   node scripts/generateLicense.js --delete KEY-123-ABC
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// Import the LicenseKey model
const LicenseKey = require('../models/LicenseKey');

// Command line arguments
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    flags[args[i].substring(2)] = args[i + 1] || true;
  }
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log(colorize('\n🔐 License Key Generator CLI', 'cyan'));
  console.log(colorize('MD ADNAN MUGHAL BOT - Admin Tool', 'blue'));
  console.log(colorize('═'.repeat(50), 'blue'));
}

function printUsage() {
  console.log(colorize('\nUsage:', 'yellow'));
  console.log('  node scripts/generateLicense.js                    # Interactive mode');
  console.log('  node scripts/generateLicense.js --help             # Show this help');
  console.log('  node scripts/generateLicense.js --list             # List all keys');
  console.log('  node scripts/generateLicense.js --stats            # Show statistics');
  console.log('');
  console.log(colorize('Generate new key:', 'yellow'));
  console.log('  --email <email>     User email (optional)');
  console.log('  --name <name>       User name (optional)');
  console.log('  --days <number>     Expiration days (optional)');
  console.log('  --notes <text>      Additional notes (optional)');
  console.log('');
  console.log(colorize('Manage existing keys:', 'yellow'));
  console.log('  --enable <key>      Enable a license key');
  console.log('  --disable <key>     Disable a license key');
  console.log('  --delete <key>      Delete a license key');
  console.log('  --info <key>        Show key information');
  console.log('');
  console.log(colorize('Examples:', 'yellow'));
  console.log('  node scripts/generateLicense.js --email user@example.com --days 365');
  console.log('  node scripts/generateLicense.js --disable MDN-123-ABC');
  console.log('  node scripts/generateLicense.js --list --status active');
}

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-signals', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(colorize('✅ Connected to MongoDB', 'green'));
  } catch (error) {
    console.error(colorize('❌ MongoDB connection failed:', 'red'), error.message);
    process.exit(1);
  }
}

async function generateLicenseKey(options = {}) {
  try {
    const keyData = {
      user_email: options.email || null,
      user_name: options.name || null,
      notes: options.notes || null
    };

    if (options.days) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(options.days));
      keyData.expires_at = expirationDate;
    }

    const licenseKey = await LicenseKey.generateKey(keyData);
    
    console.log(colorize('\n🎉 License Key Generated Successfully!', 'green'));
    console.log(colorize('═'.repeat(40), 'green'));
    console.log(colorize(`Key: ${licenseKey.key}`, 'bright'));
    console.log(`Status: ${colorize(licenseKey.status, 'green')}`);
    console.log(`Created: ${licenseKey.created_at.toLocaleString()}`);
    
    if (licenseKey.user_email) {
      console.log(`Email: ${licenseKey.user_email}`);
    }
    if (licenseKey.user_name) {
      console.log(`Name: ${licenseKey.user_name}`);
    }
    if (licenseKey.expires_at) {
      console.log(`Expires: ${licenseKey.expires_at.toLocaleString()}`);
    }
    if (licenseKey.notes) {
      console.log(`Notes: ${licenseKey.notes}`);
    }
    
    console.log(colorize('\n💾 Key saved to database', 'cyan'));
    
  } catch (error) {
    console.error(colorize('❌ Failed to generate license key:', 'red'), error.message);
  }
}

async function listLicenseKeys(options = {}) {
  try {
    const filter = {};
    if (options.status) {
      filter.status = options.status;
    }
    if (options.email) {
      filter.user_email = new RegExp(options.email, 'i');
    }

    const keys = await LicenseKey.find(filter)
      .sort({ created_at: -1 })
      .limit(options.limit || 50);

    if (keys.length === 0) {
      console.log(colorize('\n📭 No license keys found', 'yellow'));
      return;
    }

    console.log(colorize(`\n📋 License Keys (${keys.length} found)`, 'cyan'));
    console.log(colorize('═'.repeat(80), 'cyan'));
    
    keys.forEach((key, index) => {
      const statusColor = key.status === 'active' ? 'green' : 
                         key.status === 'disabled' ? 'red' : 'yellow';
      
      console.log(`\n${index + 1}. ${colorize(key.key, 'bright')}`);
      console.log(`   Status: ${colorize(key.status.toUpperCase(), statusColor)}`);
      console.log(`   Created: ${key.created_at.toLocaleDateString()}`);
      
      if (key.user_email) {
        console.log(`   Email: ${key.user_email}`);
      }
      if (key.user_name) {
        console.log(`   Name: ${key.user_name}`);
      }
      if (key.expires_at) {
        const isExpired = new Date() > key.expires_at;
        const expireColor = isExpired ? 'red' : 'yellow';
        console.log(`   Expires: ${colorize(key.expires_at.toLocaleDateString(), expireColor)}`);
      }
      if (key.usage_count > 0) {
        console.log(`   Usage: ${key.usage_count} times`);
        if (key.last_used) {
          console.log(`   Last Used: ${key.last_used.toLocaleDateString()}`);
        }
      }
      if (key.notes) {
        console.log(`   Notes: ${key.notes}`);
      }
    });
    
  } catch (error) {
    console.error(colorize('❌ Failed to list license keys:', 'red'), error.message);
  }
}

async function showStatistics() {
  try {
    const stats = await LicenseKey.getStatistics();
    
    console.log(colorize('\n📊 License Key Statistics', 'cyan'));
    console.log(colorize('═'.repeat(30), 'cyan'));
    console.log(`Total Keys: ${colorize(stats.total, 'bright')}`);
    console.log(`Active: ${colorize(stats.active, 'green')}`);
    console.log(`Disabled: ${colorize(stats.disabled, 'red')}`);
    console.log(`Expired: ${colorize(stats.expired, 'yellow')}`);
    
  } catch (error) {
    console.error(colorize('❌ Failed to get statistics:', 'red'), error.message);
  }
}

async function updateKeyStatus(keyValue, newStatus) {
  try {
    const key = await LicenseKey.findOne({ key: keyValue });
    
    if (!key) {
      console.log(colorize(`❌ License key "${keyValue}" not found`, 'red'));
      return;
    }
    
    const oldStatus = key.status;
    key.status = newStatus;
    key.updated_at = new Date();
    await key.save();
    
    console.log(colorize(`\n✅ License key status updated`, 'green'));
    console.log(`Key: ${colorize(key.key, 'bright')}`);
    console.log(`Status: ${colorize(oldStatus, 'red')} → ${colorize(newStatus, 'green')}`);
    
  } catch (error) {
    console.error(colorize('❌ Failed to update key status:', 'red'), error.message);
  }
}

async function deleteKey(keyValue) {
  try {
    const key = await LicenseKey.findOne({ key: keyValue });
    
    if (!key) {
      console.log(colorize(`❌ License key "${keyValue}" not found`, 'red'));
      return;
    }
    
    // Confirm deletion
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(colorize(`\n⚠️  Are you sure you want to delete key "${keyValue}"? (yes/no): `, 'yellow'), resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log(colorize('❌ Deletion cancelled', 'yellow'));
      return;
    }
    
    await LicenseKey.deleteOne({ key: keyValue });
    console.log(colorize(`\n✅ License key "${keyValue}" deleted successfully`, 'green'));
    
  } catch (error) {
    console.error(colorize('❌ Failed to delete key:', 'red'), error.message);
  }
}

async function showKeyInfo(keyValue) {
  try {
    const key = await LicenseKey.findOne({ key: keyValue });
    
    if (!key) {
      console.log(colorize(`❌ License key "${keyValue}" not found`, 'red'));
      return;
    }
    
    const statusColor = key.status === 'active' ? 'green' : 
                       key.status === 'disabled' ? 'red' : 'yellow';
    
    console.log(colorize('\n🔍 License Key Information', 'cyan'));
    console.log(colorize('═'.repeat(40), 'cyan'));
    console.log(`Key: ${colorize(key.key, 'bright')}`);
    console.log(`Status: ${colorize(key.status.toUpperCase(), statusColor)}`);
    console.log(`Created: ${key.created_at.toLocaleString()}`);
    console.log(`Updated: ${key.updated_at.toLocaleString()}`);
    
    if (key.user_email) {
      console.log(`Email: ${key.user_email}`);
    }
    if (key.user_name) {
      console.log(`Name: ${key.user_name}`);
    }
    if (key.expires_at) {
      const isExpired = new Date() > key.expires_at;
      const expireColor = isExpired ? 'red' : 'yellow';
      console.log(`Expires: ${colorize(key.expires_at.toLocaleString(), expireColor)}`);
      if (isExpired) {
        console.log(colorize('⚠️  This key has expired', 'red'));
      }
    } else {
      console.log(colorize('Expires: Never', 'green'));
    }
    
    console.log(`Usage Count: ${key.usage_count}`);
    if (key.last_used) {
      console.log(`Last Used: ${key.last_used.toLocaleString()}`);
    } else {
      console.log(colorize('Last Used: Never', 'yellow'));
    }
    
    if (key.notes) {
      console.log(`Notes: ${key.notes}`);
    }
    
    // Validation status
    const isValid = await key.isValid();
    console.log(`\nValidation: ${colorize(isValid ? 'VALID' : 'INVALID', isValid ? 'green' : 'red')}`);
    
  } catch (error) {
    console.error(colorize('❌ Failed to get key information:', 'red'), error.message);
  }
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(colorize('\n🎯 Interactive License Key Generator', 'cyan'));
  console.log('Press Ctrl+C to exit at any time\n');
  
  try {
    const email = await new Promise(resolve => {
      rl.question('User Email (optional): ', resolve);
    });
    
    const name = await new Promise(resolve => {
      rl.question('User Name (optional): ', resolve);
    });
    
    const days = await new Promise(resolve => {
      rl.question('Expiration Days (optional): ', resolve);
    });
    
    const notes = await new Promise(resolve => {
      rl.question('Notes (optional): ', resolve);
    });
    
    rl.close();
    
    const options = {};
    if (email.trim()) options.email = email.trim();
    if (name.trim()) options.name = name.trim();
    if (days.trim() && !isNaN(days.trim())) options.days = days.trim();
    if (notes.trim()) options.notes = notes.trim();
    
    await generateLicenseKey(options);
    
  } catch (error) {
    rl.close();
    console.error(colorize('❌ Interactive mode failed:', 'red'), error.message);
  }
}

async function main() {
  printHeader();
  
  // Handle help flag
  if (flags.help || flags.h) {
    printUsage();
    return;
  }
  
  // Connect to database
  await connectToDatabase();
  
  try {
    // Handle different commands
    if (flags.list) {
      await listLicenseKeys(flags);
    } else if (flags.stats) {
      await showStatistics();
    } else if (flags.enable) {
      await updateKeyStatus(flags.enable, 'active');
    } else if (flags.disable) {
      await updateKeyStatus(flags.disable, 'disabled');
    } else if (flags.delete) {
      await deleteKey(flags.delete);
    } else if (flags.info) {
      await showKeyInfo(flags.info);
    } else if (flags.email || flags.name || flags.days || flags.notes) {
      // Generate with provided options
      await generateLicenseKey(flags);
    } else {
      // Interactive mode
      await interactiveMode();
    }
    
  } catch (error) {
    console.error(colorize('❌ Operation failed:', 'red'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(colorize('\n👋 Disconnected from database', 'cyan'));
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log(colorize('\n\n👋 Goodbye!', 'cyan'));
  await mongoose.disconnect();
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('❌ Fatal error:', 'red'), error.message);
    process.exit(1);
  });
}

module.exports = {
  generateLicenseKey,
  listLicenseKeys,
  showStatistics,
  updateKeyStatus,
  deleteKey,
  showKeyInfo
};
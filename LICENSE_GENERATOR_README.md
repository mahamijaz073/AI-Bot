# 🔐 License Key Generator

**MD ADNAN MUGHAL BOT - License Management System**

A comprehensive license key generation and management system for the AI Trading Signal Bot. This tool allows administrators to create, manage, and monitor license keys that control access to the bot's features.

## 🎯 Features

- **Generate License Keys**: Create unique license keys with customizable expiration dates
- **User Management**: Assign keys to specific users with email and name tracking
- **Status Control**: Enable/disable keys instantly
- **Usage Tracking**: Monitor key usage statistics and last access times
- **Multiple Interfaces**: Web dashboard and command-line tool
- **MongoDB Integration**: All keys stored securely in MongoDB
- **Admin Protection**: Password-protected access for security

## 🚀 Quick Start

### Web Interface (Recommended)

1. **Start the backend server**:
   ```bash
   npm start
   ```

2. **Access the admin panel**:
   ```
   http://localhost:5000/admin
   ```

3. **Login with admin password**:
   - Default password: `admin123` (change in `.env` file)
   - Set custom password: `ADMIN_PASSWORD=your_secure_password`

### Command Line Interface

1. **Interactive mode** (easiest):
   ```bash
   node scripts/generateLicense.js
   ```

2. **Quick generation**:
   ```bash
   node scripts/generateLicense.js --email user@example.com --days 365
   ```

3. **List all keys**:
   ```bash
   node scripts/generateLicense.js --list
   ```

## 📋 Web Interface Guide

### Dashboard Overview
- **Statistics Cards**: View total, active, disabled, and expired keys
- **Generate Section**: Create new license keys with optional user details
- **Management Table**: View, filter, and manage existing keys

### Generating a New Key
1. Fill in optional user details (email, name)
2. Set expiration period (days from now)
3. Add notes for reference
4. Click "Generate License Key"
5. Copy the generated key for distribution

### Managing Existing Keys
- **Filter**: By status (active/disabled/expired)
- **Search**: By key, email, or user name
- **Enable/Disable**: Toggle key status instantly
- **Delete**: Permanently remove keys (with confirmation)

## 💻 Command Line Interface Guide

### Basic Commands

```bash
# Show help
node scripts/generateLicense.js --help

# Interactive mode (guided setup)
node scripts/generateLicense.js

# Generate with specific options
node scripts/generateLicense.js --email user@example.com --name "John Doe" --days 365 --notes "Premium user"

# List all keys
node scripts/generateLicense.js --list

# Show statistics
node scripts/generateLicense.js --stats

# Get key information
node scripts/generateLicense.js --info MDN-123-ABC

# Enable/disable keys
node scripts/generateLicense.js --enable MDN-123-ABC
node scripts/generateLicense.js --disable MDN-123-ABC

# Delete a key (with confirmation)
node scripts/generateLicense.js --delete MDN-123-ABC
```

### Advanced Filtering

```bash
# List only active keys
node scripts/generateLicense.js --list --status active

# List keys for specific email
node scripts/generateLicense.js --list --email user@example.com

# Limit results
node scripts/generateLicense.js --list --limit 10
```

## 🔑 License Key Format

License keys follow the format: `MDN-XXX-YYY`

- **MDN**: Brand prefix (MD ADNAN MUGHAL)
- **XXX**: Random alphanumeric sequence
- **YYY**: Random alphanumeric sequence

Example: `MDN-A7B-9C2`, `MDN-X1Y-Z8W`

## 📊 Database Schema

License keys are stored in MongoDB with the following structure:

```javascript
{
  "_id": ObjectId,
  "key": "MDN-A7B-9C2",
  "status": "active", // active, disabled, expired
  "user_email": "user@example.com",
  "user_name": "John Doe",
  "created_at": ISODate,
  "updated_at": ISODate,
  "expires_at": ISODate, // null for never expires
  "last_used": ISODate,
  "usage_count": 0,
  "notes": "Premium user subscription"
}
```

## 🔒 Security Features

### Admin Authentication
- Password protection for all admin operations
- Configurable admin password via environment variables
- Session-based authentication for web interface

### Key Validation
- Automatic expiration checking
- Status validation (active/disabled)
- Usage tracking and monitoring
- Secure key generation with cryptographic randomness

## ⚙️ Configuration

### Environment Variables

```bash
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/trading-signals

# Admin password for license management
ADMIN_PASSWORD=your_secure_password

# Server port
PORT=5000
```

### Default Settings

- **Admin Password**: `admin123` (change immediately)
- **Key Format**: `MDN-XXX-YYY`
- **Default Status**: `active`
- **Default Expiration**: Never (unless specified)

## 🛠️ API Endpoints

The license management system exposes REST API endpoints:

```
POST   /api/admin/license-keys/generate     # Generate new key
GET    /api/admin/license-keys              # List all keys
GET    /api/admin/license-keys/:id          # Get specific key
PATCH  /api/admin/license-keys/:id/status   # Update key status
PATCH  /api/admin/license-keys/:id          # Update key details
DELETE /api/admin/license-keys/:id          # Delete key
GET    /api/admin/stats/license-keys        # Get statistics
```

All endpoints require the `X-Admin-Password` header for authentication.

## 📝 Usage Examples

### Scenario 1: New Customer Registration
```bash
# Generate a 1-year license for a new customer
node scripts/generateLicense.js --email customer@company.com --name "Jane Smith" --days 365 --notes "Annual subscription - paid"
```

### Scenario 2: Temporary Access
```bash
# Generate a 7-day trial license
node scripts/generateLicense.js --email trial@user.com --days 7 --notes "7-day trial period"
```

### Scenario 3: Bulk Management
```bash
# List all expired keys
node scripts/generateLicense.js --list --status expired

# Disable a specific key
node scripts/generateLicense.js --disable MDN-ABC-123
```

## 🔧 Troubleshooting

### Common Issues

1. **"MongoDB connection failed"**
   - Check if MongoDB is running
   - Verify MONGODB_URI in .env file
   - Ensure database permissions

2. **"Invalid admin password"**
   - Check ADMIN_PASSWORD in .env file
   - Default password is `admin123`
   - Restart server after changing password

3. **"License key not found"**
   - Verify key format (MDN-XXX-YYY)
   - Check if key exists in database
   - Use `--list` to see all available keys

4. **"Permission denied"**
   - Ensure you're using admin credentials
   - Check X-Admin-Password header for API calls

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=license:*
node scripts/generateLicense.js
```

## 🚀 Integration with Trading Bot

The generated license keys automatically work with the trading bot's license validation system:

1. **Generate a key** using this tool
2. **Provide the key** to the user
3. **User enters key** in the bot's license activation interface
4. **Bot validates** against MongoDB and enables features

## 📞 Support

For technical support or questions:

- **Developer**: MD ADNAN MUGHAL
- **Documentation**: This README file
- **Issues**: Check MongoDB logs and server console

---

**⚠️ Important Security Notes:**

1. **Change the default admin password** immediately
2. **Keep admin credentials secure** and don't share them
3. **Regularly monitor** license key usage and statistics
4. **Backup your MongoDB** database regularly
5. **Use HTTPS** in production environments

---

*This license management system is part of the MD ADNAN MUGHAL AI Trading Signal Bot project.*
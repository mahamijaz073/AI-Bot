const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const signalRoutes = require('./routes/signals');
const licenseRoutes = require('./routes/license');
const pairsRoutes = require('./routes/pairs');
const adminRoutes = require('./routes/admin');
const SignalGenerator = require('./services/signalGenerator');
const { 
  requireLicense, 
  performStartupLicenseCheck, 
  initializeLicenseSystem,
  licenseErrorHandler
} = require('./middleware/licenseAuth');
const { Signal, Alert, UserPreference } = require('./models');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Only serve static files if build directory exists
const buildPath = path.join(__dirname, 'client/build');
const fs = require('fs');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-signals', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// License routes (no authentication required)
app.use('/api/license', licenseRoutes);

// Admin routes (password protected, no license required)
app.use('/api/admin', adminRoutes);

// Health check route (no authentication required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apply license authentication to all other API routes
app.use('/api', requireLicense);

// Routes (protected by license)
app.use('/api/signals', signalRoutes);
app.use('/api/pairs', pairsRoutes);

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  clients.add(ws);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        ws.pair = data.pair;
        ws.timeframes = data.timeframes || ['5m', '15m', '30m', '1h'];
        
        // Send latest signals for subscribed pair
        const signals = await Signal.find({ 
          pair: data.pair,
          timeframe: { $in: ws.timeframes }
        }).sort({ timestamp: -1 }).limit(20);
        
        ws.send(JSON.stringify({
          type: 'signals',
          data: signals
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed');
  });
});

// Broadcast signals to all connected clients
function broadcastSignal(signal) {
  const message = JSON.stringify({
    type: 'newSignal',
    data: signal
  });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      if (!client.pair || client.pair === signal.pair) {
        if (!client.timeframes || client.timeframes.includes(signal.timeframe)) {
          client.send(message);
        }
      }
    }
  });
}

// Initialize Signal Generator
const signalGeneratorInstance = new SignalGenerator();

// Signal generation function
const startSignalGeneration = () => {
  // Auto signal generation - runs every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
  try {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
    const timeframes = ['5m', '15m', '30m', '1h'];
    
    for (const pair of pairs) {
      for (const timeframe of timeframes) {
        const signal = await signalGeneratorInstance.generateSignal(pair, timeframe);
        if (signal) {
          // Save to database
          const newSignal = new Signal(signal);
          await newSignal.save();
          
          // Broadcast to clients
          broadcastSignal(signal);
          
          // Check for high confidence alerts
          if (signal.confidence === 'High') {
            const alert = new Alert({
              pair: signal.pair,
              signal: signal.signal,
              price: signal.price,
              confidence: signal.confidence,
              timeframe: signal.timeframe,
              message: `High confidence ${signal.signal} signal for ${signal.pair} at ${signal.price}`
            });
            await alert.save();
            
            // Broadcast alert
            const alertMessage = JSON.stringify({
              type: 'alert',
              data: alert
            });
            
            clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(alertMessage);
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Signal generation error:', error);
  }
  });
};

// API Routes

app.get('/api/timeframes', (req, res) => {
  const timeframes = ['5m', '15m', '30m', '1h'];
  res.json(timeframes);
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// License error handler
app.use(licenseErrorHandler);

// Serve admin panel
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'admin/index.html');
  res.sendFile(adminPath);
});

// Serve React app for non-API routes (only if build exists)
if (fs.existsSync(buildPath)) {
  app.get('*', (req, res) => {
    // Skip API routes and admin
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const indexPath = path.join(buildPath, 'index.html');
    res.sendFile(indexPath);
  });
} else {
  // Development mode - just return info for non-API routes
  app.get('*', (req, res) => {
    // Skip API routes and admin
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    res.status(200).json({ 
      message: 'Development mode - Frontend running on port 3000',
      backend: 'http://localhost:5000',
      frontend: 'http://localhost:3000',
      admin: 'http://localhost:5000/admin'
    });
  });
}

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Initialize license system first
    console.log('🚀 Starting AI Trading Signal Bot...');
    
    const licenseInitialized = await initializeLicenseSystem();
    if (!licenseInitialized) {
      console.warn('⚠️  License system initialization failed, but continuing...');
    }
    
    // Connect to main MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-signals');
    console.log('Connected to MongoDB');
    
    // Perform startup license check
    const licenseCheck = await performStartupLicenseCheck();
    if (!licenseCheck.success) {
      console.log('⚠️  License check failed:', licenseCheck.message);
      if (licenseCheck.requiresActivation) {
        console.log('📝 Bot will require license activation via web interface.');
      }
    }
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('AI Trading Signal Bot started successfully!');
      
      if (licenseCheck.success) {
        console.log('✅ Bot is properly licensed and ready to use!');
        // Start signal generation only if licensed
        startSignalGeneration();
      } else {
        console.log('⚠️  Bot requires license activation. Please visit the web interface.');
        console.log('🔒 Signal generation disabled until license is activated.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
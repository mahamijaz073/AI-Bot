const mongoose = require('mongoose');

// Signal Schema
const signalSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true
  },
  signal: {
    type: String,
    enum: ['BUY', 'SELL', 'HOLD'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  confidence: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  timeframe: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  indicators: {
    rsi: Number,
    macd: {
      macd: Number,
      signal: Number,
      histogram: Number
    },
    ema: {
      ema12: Number,
      ema26: Number
    },
    bollinger: {
      upper: Number,
      middle: Number,
      lower: Number
    },
    volume: Number
  },
  reasoning: String,
  targetPrice: Number,
  stopLoss: Number
});

// Alert Schema
const alertSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true
  },
  signal: {
    type: String,
    enum: ['BUY', 'SELL', 'HOLD'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  confidence: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  timeframe: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

// User Preference Schema
const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default'
  },
  selectedPair: {
    type: String,
    default: 'BTCUSDT'
  },
  selectedTimeframes: {
    type: [String],
    default: ['5m', '15m', '30m', '1h']
  },
  alertSettings: {
    enableAlerts: {
      type: Boolean,
      default: true
    },
    minConfidence: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium'
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Market Data Schema for caching
const marketDataSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true
  },
  timeframe: {
    type: String,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
signalSchema.index({ pair: 1, timeframe: 1, timestamp: -1 });
alertSchema.index({ timestamp: -1 });
marketDataSchema.index({ pair: 1, timeframe: 1 });

const Signal = mongoose.model('Signal', signalSchema);
const Alert = mongoose.model('Alert', alertSchema);
const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);
const MarketData = mongoose.model('MarketData', marketDataSchema);

module.exports = {
  Signal,
  Alert,
  UserPreference,
  MarketData
};
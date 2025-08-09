const express = require('express');
const router = express.Router();
const { Signal, Alert, UserPreference } = require('../models');
const SignalGenerator = require('../services/signalGenerator');

const signalGenerator = new SignalGenerator();

// Get all signals with filtering
router.get('/', async (req, res) => {
  try {
    const { pair, timeframe, confidence, limit = 50, page = 1 } = req.query;
    
    let query = {};
    
    if (pair) query.pair = pair;
    if (timeframe) {
      if (Array.isArray(timeframe)) {
        query.timeframe = { $in: timeframe };
      } else {
        query.timeframe = timeframe;
      }
    }
    if (confidence) {
      if (Array.isArray(confidence)) {
        query.confidence = { $in: confidence };
      } else {
        query.confidence = confidence;
      }
    }
    
    const skip = (page - 1) * limit;
    
    const signals = await Signal.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Signal.countDocuments(query);
    
    res.json({
      signals,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: signals.length,
        totalSignals: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get signals for a specific pair
router.get('/pair/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { timeframe, limit = 20 } = req.query;
    
    let query = { pair };
    if (timeframe) {
      query.timeframe = Array.isArray(timeframe) ? { $in: timeframe } : timeframe;
    }
    
    const signals = await Signal.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json(signals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest signals for dashboard
router.get('/latest', async (req, res) => {
  try {
    const { pairs, timeframes } = req.query;
    
    let query = {};
    if (pairs) {
      query.pair = { $in: Array.isArray(pairs) ? pairs : [pairs] };
    }
    if (timeframes) {
      query.timeframe = { $in: Array.isArray(timeframes) ? timeframes : [timeframes] };
    }
    
    const signals = await Signal.find(query)
      .sort({ timestamp: -1 })
      .limit(100);
    
    // Group by pair and timeframe
    const groupedSignals = {};
    signals.forEach(signal => {
      const key = `${signal.pair}_${signal.timeframe}`;
      if (!groupedSignals[key]) {
        groupedSignals[key] = signal;
      }
    });
    
    res.json(Object.values(groupedSignals));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate signal manually for testing
router.post('/generate', async (req, res) => {
  try {
    const { pair, timeframe } = req.body;
    
    if (!pair || !timeframe) {
      return res.status(400).json({ error: 'Pair and timeframe are required' });
    }
    
    const signal = await signalGenerator.generateSignal(pair, timeframe);
    
    if (signal) {
      const newSignal = new Signal(signal);
      await newSignal.save();
      res.json(newSignal);
    } else {
      res.json({ message: 'No signal generated for current market conditions' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get signal statistics
router.get('/stats', async (req, res) => {
  try {
    const { pair, timeframe, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    let query = { timestamp: { $gte: startDate } };
    if (pair) query.pair = pair;
    if (timeframe) query.timeframe = timeframe;
    
    const stats = await Signal.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            signal: '$signal',
            confidence: '$confidence'
          },
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $group: {
          _id: '$_id.signal',
          confidenceBreakdown: {
            $push: {
              confidence: '$_id.confidence',
              count: '$count',
              avgPrice: '$avgPrice'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);
    
    const totalSignals = await Signal.countDocuments(query);
    const highConfidenceSignals = await Signal.countDocuments({
      ...query,
      confidence: 'High'
    });
    
    res.json({
      totalSignals,
      highConfidenceSignals,
      highConfidencePercentage: totalSignals > 0 ? (highConfidenceSignals / totalSignals * 100).toFixed(2) : 0,
      signalBreakdown: stats,
      period: `${days} days`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete old signals (cleanup)
router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const result = await Signal.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    res.json({
      message: `Deleted ${result.deletedCount} signals older than ${days} days`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user preferences
router.get('/preferences/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    
    let preferences = await UserPreference.findOne({ userId });
    
    if (!preferences) {
      preferences = new UserPreference({ userId });
      await preferences.save();
    }
    
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
router.put('/preferences/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const updates = req.body;
    
    const preferences = await UserPreference.findOneAndUpdate(
      { userId },
      { ...updates, lastUpdated: new Date() },
      { new: true, upsert: true }
    );
    
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get market data for chart
router.get('/market-data/:pair/:timeframe', async (req, res) => {
  try {
    const { pair, timeframe } = req.params;
    const { limit = 100 } = req.query;
    
    const data = await signalGenerator.getMarketData(pair, timeframe, parseInt(limit));
    
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: 'Market data not available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
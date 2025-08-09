const express = require('express');
const MarketDataService = require('../services/marketDataService');
const router = express.Router();

const marketDataService = new MarketDataService();

// Get all available trading pairs
router.get('/', async (req, res) => {
  try {
    const pairs = await marketDataService.getAllTradingPairs();
    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading pairs'
    });
  }
});

// Get crypto pairs only
router.get('/crypto', async (req, res) => {
  try {
    const pairs = await marketDataService.getCryptoPairs();
    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    console.error('Error fetching crypto pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crypto pairs'
    });
  }
});

// Get forex pairs only
router.get('/forex', async (req, res) => {
  try {
    const pairs = marketDataService.getForexPairs();
    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    console.error('Error fetching forex pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forex pairs'
    });
  }
});

// Get current price for a symbol
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto' } = req.query;
    
    if (!marketDataService.isSymbolSupported(symbol)) {
      return res.status(400).json({
        success: false,
        error: 'Symbol not supported'
      });
    }
    
    const price = await marketDataService.getCurrentPrice(symbol, type);
    res.json({
      success: true,
      data: {
        symbol,
        price,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price'
    });
  }
});

// Get 24hr statistics for a symbol
router.get('/stats/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto' } = req.query;
    
    if (!marketDataService.isSymbolSupported(symbol)) {
      return res.status(400).json({
        success: false,
        error: 'Symbol not supported'
      });
    }
    
    const stats = await marketDataService.get24hrStats(symbol, type);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching 24hr stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch 24hr statistics'
    });
  }
});

// Get historical data for a symbol
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '5m', limit = 100, type } = req.query;
    
    if (!marketDataService.isSymbolSupported(symbol)) {
      return res.status(400).json({
        success: false,
        error: 'Symbol not supported'
      });
    }
    
    const symbolType = type || marketDataService.getSymbolType(symbol);
    let data;
    
    if (symbolType === 'crypto') {
      data = await marketDataService.getCryptoHistoricalData(symbol, interval, parseInt(limit));
    } else {
      data = await marketDataService.getForexHistoricalData(symbol, interval, parseInt(limit));
    }
    
    res.json({
      success: true,
      data: {
        symbol,
        interval,
        data
      }
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data'
    });
  }
});

// Search pairs by name or symbol
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const allPairs = await marketDataService.getAllTradingPairs();
    const searchTerm = q.toLowerCase();
    
    const filteredPairs = allPairs.all.filter(pair => 
      pair.symbol.toLowerCase().includes(searchTerm) ||
      pair.displayName.toLowerCase().includes(searchTerm) ||
      pair.baseAsset.toLowerCase().includes(searchTerm) ||
      pair.quoteAsset.toLowerCase().includes(searchTerm)
    );
    
    res.json({
      success: true,
      data: filteredPairs
    });
  } catch (error) {
    console.error('Error searching pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search pairs'
    });
  }
});

module.exports = router;
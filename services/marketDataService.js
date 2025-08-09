const axios = require('axios');

class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.binanceBaseUrl = 'https://api.binance.com/api/v3';
    this.forexApiKey = process.env.FOREX_API_KEY || 'demo';
    this.supportedCryptoPairs = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT',
      'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'AVAXUSDT', 'MATICUSDT',
      'ATOMUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT',
      'ICPUSDT', 'FTMUSDT', 'HBARUSDT', 'ALGOUSDT', 'AXSUSDT', 'SANDUSDT'
    ];
  }

  // Get all available trading pairs (crypto + forex/gold)
  async getAllTradingPairs() {
    try {
      const cryptoPairs = await this.getCryptoPairs();
      const forexPairs = this.getForexPairs();
      
      return {
        crypto: cryptoPairs,
        forex: forexPairs,
        all: [...cryptoPairs, ...forexPairs]
      };
    } catch (error) {
      console.error('Error getting all trading pairs:', error.message);
      return {
        crypto: this.getDefaultCryptoPairs(),
        forex: this.getForexPairs(),
        all: [...this.getDefaultCryptoPairs(), ...this.getForexPairs()]
      };
    }
  }

  // Get available crypto trading pairs from Binance
  async getCryptoPairs() {
    const cacheKey = 'crypto_pairs';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.binanceBaseUrl}/exchangeInfo`);
      const pairs = response.data.symbols
        .filter(symbol => 
          symbol.status === 'TRADING' && 
          symbol.quoteAsset === 'USDT' &&
          this.supportedCryptoPairs.includes(symbol.symbol)
        )
        .map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          displayName: `${symbol.baseAsset}/${symbol.quoteAsset}`,
          type: 'crypto',
          minPrice: parseFloat(symbol.filters.find(f => f.filterType === 'PRICE_FILTER')?.minPrice || '0'),
          tickSize: parseFloat(symbol.filters.find(f => f.filterType === 'PRICE_FILTER')?.tickSize || '0.01')
        }));

      this.cache.set(cacheKey, {
        data: pairs,
        timestamp: Date.now()
      });

      return pairs;
    } catch (error) {
      console.error('Error fetching crypto pairs:', error.message);
      return this.getDefaultCryptoPairs();
    }
  }

  // Get default crypto pairs (fallback)
  getDefaultCryptoPairs() {
    return [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', displayName: 'BTC/USDT', type: 'crypto' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', displayName: 'ETH/USDT', type: 'crypto' },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', displayName: 'BNB/USDT', type: 'crypto' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', displayName: 'ADA/USDT', type: 'crypto' },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', displayName: 'SOL/USDT', type: 'crypto' },
      { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', displayName: 'XRP/USDT', type: 'crypto' },
      { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', displayName: 'DOT/USDT', type: 'crypto' },
      { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', displayName: 'LINK/USDT', type: 'crypto' }
    ];
  }

  // Get forex pairs (including Gold)
  getForexPairs() {
    return [
      { 
        symbol: 'XAUUSD', 
        baseAsset: 'XAU', 
        quoteAsset: 'USD', 
        displayName: 'Gold/USD', 
        type: 'commodity',
        description: 'Gold vs US Dollar'
      },
      { 
        symbol: 'EURUSD', 
        baseAsset: 'EUR', 
        quoteAsset: 'USD', 
        displayName: 'EUR/USD', 
        type: 'forex',
        description: 'Euro vs US Dollar'
      },
      { 
        symbol: 'GBPUSD', 
        baseAsset: 'GBP', 
        quoteAsset: 'USD', 
        displayName: 'GBP/USD', 
        type: 'forex',
        description: 'British Pound vs US Dollar'
      },
      { 
        symbol: 'USDJPY', 
        baseAsset: 'USD', 
        quoteAsset: 'JPY', 
        displayName: 'USD/JPY', 
        type: 'forex',
        description: 'US Dollar vs Japanese Yen'
      },
      { 
        symbol: 'AUDUSD', 
        baseAsset: 'AUD', 
        quoteAsset: 'USD', 
        displayName: 'AUD/USD', 
        type: 'forex',
        description: 'Australian Dollar vs US Dollar'
      },
      { 
        symbol: 'USDCAD', 
        baseAsset: 'USD', 
        quoteAsset: 'CAD', 
        displayName: 'USD/CAD', 
        type: 'forex',
        description: 'US Dollar vs Canadian Dollar'
      }
    ];
  }



  // Get current price for a symbol
  async getCurrentPrice(symbol, type = 'crypto') {
    const cacheKey = `price_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 seconds cache
      return cached.data;
    }

    try {
      let price;
      
      if (type === 'crypto') {
        const response = await axios.get(`${this.binanceBaseUrl}/ticker/price?symbol=${symbol}`);
        price = parseFloat(response.data.price);
      } else {
        // For forex/gold, use mock data (in production, use a real forex API)
        price = this.getMockPrice(symbol);
      }

      this.cache.set(cacheKey, {
        data: price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error.message);
      return this.getMockPrice(symbol);
    }
  }

  // Get 24hr ticker statistics
  async get24hrStats(symbol, type = 'crypto') {
    try {
      if (type === 'crypto') {
        const response = await axios.get(`${this.binanceBaseUrl}/ticker/24hr?symbol=${symbol}`);
        return {
          symbol: response.data.symbol,
          priceChange: parseFloat(response.data.priceChange),
          priceChangePercent: parseFloat(response.data.priceChangePercent),
          weightedAvgPrice: parseFloat(response.data.weightedAvgPrice),
          prevClosePrice: parseFloat(response.data.prevClosePrice),
          lastPrice: parseFloat(response.data.lastPrice),
          bidPrice: parseFloat(response.data.bidPrice),
          askPrice: parseFloat(response.data.askPrice),
          openPrice: parseFloat(response.data.openPrice),
          highPrice: parseFloat(response.data.highPrice),
          lowPrice: parseFloat(response.data.lowPrice),
          volume: parseFloat(response.data.volume),
          quoteVolume: parseFloat(response.data.quoteVolume),
          count: parseInt(response.data.count)
        };
      } else {
        // Mock data for forex/gold
        return this.getMock24hrStats(symbol);
      }
    } catch (error) {
      console.error(`Error fetching 24hr stats for ${symbol}:`, error.message);
      return this.getMock24hrStats(symbol);
    }
  }





  // Get historical data for crypto
  async getCryptoHistoricalData(symbol, interval = '5m', limit = 100) {
    try {
      const response = await axios.get(`${this.binanceBaseUrl}/klines`, {
        params: {
          symbol: symbol,
          interval: interval,
          limit: limit
        }
      });

      return response.data.map(kline => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      return this.generateMockHistoricalData(symbol, limit);
    }
  }

  // Get historical data for forex/gold
  async getForexHistoricalData(symbol, interval = '5m', limit = 100) {
    // In production, this would use a forex API like Alpha Vantage, FXCM, etc.
    // For now, we'll generate realistic mock data
    return this.generateMockHistoricalData(symbol, limit, interval);
  }

  // Generate mock price data with realistic values
  getMockPrice(symbol) {
    const basePrices = {
      'XAUUSD': 2050.00,
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 149.50,
      'AUDUSD': 0.6750,
      'USDCAD': 1.3650,
      'BTCUSDT': 43500,
      'ETHUSDT': 2650
    };
    
    const basePrice = basePrices[symbol] || 100;
    const variation = (Math.random() - 0.5) * 0.015; // ±0.75% variation
    return parseFloat((basePrice * (1 + variation)).toFixed(symbol.includes('JPY') ? 2 : 4));
  }

  // Generate mock 24hr statistics
  getMock24hrStats(symbol) {
    const currentPrice = this.getMockPrice(symbol);
    const openPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
    const priceChange = currentPrice - openPrice;
    const priceChangePercent = (priceChange / openPrice) * 100;
    
    return {
      symbol,
      priceChange: parseFloat(priceChange.toFixed(4)),
      priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
      weightedAvgPrice: parseFloat(((currentPrice + openPrice) / 2).toFixed(4)),
      prevClosePrice: parseFloat(openPrice.toFixed(4)),
      lastPrice: parseFloat(currentPrice.toFixed(4)),
      bidPrice: parseFloat((currentPrice * 0.9995).toFixed(4)),
      askPrice: parseFloat((currentPrice * 1.0005).toFixed(4)),
      openPrice: parseFloat(openPrice.toFixed(4)),
      highPrice: parseFloat((Math.max(currentPrice, openPrice) * 1.01).toFixed(4)),
      lowPrice: parseFloat((Math.min(currentPrice, openPrice) * 0.99).toFixed(4)),
      volume: Math.floor(Math.random() * 1000000),
      quoteVolume: Math.floor(Math.random() * 50000000),
      count: Math.floor(Math.random() * 100000)
    };
  }

  // Generate realistic mock historical data
  generateMockHistoricalData(symbol, limit = 100, interval = '5m') {
    const data = [];
    const basePrice = this.getMockPrice(symbol);
    let currentPrice = basePrice;
    const now = Date.now();
    
    // Determine interval in milliseconds
    const intervalMs = this.getIntervalMs(interval);
    
    // Generate trend direction
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const trendStrength = Math.random() * 0.001; // Max 0.1% per candle
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      
      // Add trend and random variation
      const trendChange = trendDirection * trendStrength * currentPrice;
      const randomVariation = (Math.random() - 0.5) * 0.008 * currentPrice; // ±0.4%
      
      const open = currentPrice;
      const change = trendChange + randomVariation;
      
      // Generate realistic OHLC
      const close = open + change;
      const volatility = Math.abs(change) * (1 + Math.random());
      const high = Math.max(open, close) + volatility * Math.random();
      const low = Math.min(open, close) - volatility * Math.random();
      
      // Generate volume (higher volume on bigger moves)
      const volumeBase = symbol.includes('USD') ? 100000 : 1000000;
      const volumeMultiplier = 1 + Math.abs(change / currentPrice) * 10;
      const volume = volumeBase * volumeMultiplier * (0.5 + Math.random());
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(symbol.includes('JPY') ? 2 : 4)),
        high: parseFloat(high.toFixed(symbol.includes('JPY') ? 2 : 4)),
        low: parseFloat(low.toFixed(symbol.includes('JPY') ? 2 : 4)),
        close: parseFloat(close.toFixed(symbol.includes('JPY') ? 2 : 4)),
        volume: parseFloat(volume.toFixed(2))
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  // Convert interval string to milliseconds
  getIntervalMs(interval) {
    const intervalMap = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    return intervalMap[interval] || 5 * 60 * 1000; // Default to 5 minutes
  }

  // Check if symbol is supported
  isSymbolSupported(symbol) {
    const forexSymbols = this.getForexPairs().map(p => p.symbol);
    return this.supportedCryptoPairs.includes(symbol) || forexSymbols.includes(symbol);
  }

  // Get symbol type (crypto, forex, commodity)
  getSymbolType(symbol) {
    if (this.supportedCryptoPairs.includes(symbol)) {
      return 'crypto';
    }
    
    const forexPair = this.getForexPairs().find(p => p.symbol === symbol);
    return forexPair ? forexPair.type : 'unknown';
  }


}

module.exports = MarketDataService;
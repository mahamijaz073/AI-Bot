const axios = require('axios');
const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic, ATR, ADX } = require('technicalindicators');
const { MarketData } = require('../models');
const MarketDataService = require('./marketDataService');

class SignalGenerator {
  constructor() {
    this.marketDataService = new MarketDataService();
    this.signalHistory = new Map(); // Cache recent signals to avoid duplicates
    this.baseURL = 'https://api.binance.com/api/v3';
    this.cache = new Map();
  }

  // Determine if pair is crypto or forex
  getPairType(pair) {
    if (pair.includes('XAU') || pair.includes('EUR') || pair.includes('GBP') || 
        pair.includes('JPY') || pair.includes('CHF') || pair.includes('AUD') || 
        pair.includes('CAD')) {
      return 'forex';
    }
    return 'crypto';
  }

  // Check if signal is valid and not duplicate
  isValidNewSignal(signal) {
    const key = `${signal.pair}_${signal.timeframe}`;
    const lastSignal = this.signalHistory.get(key);
    
    if (!lastSignal) return true;
    
    // Avoid duplicate signals within 15 minutes
    const timeDiff = Date.now() - lastSignal.timestamp;
    if (timeDiff < 15 * 60 * 1000 && lastSignal.signal === signal.signal) {
      return false;
    }
    
    return true;
  }

  // Cache signal to avoid duplicates
  cacheSignal(signal) {
    const key = `${signal.pair}_${signal.timeframe}`;
    this.signalHistory.set(key, {
      signal: signal.signal,
      timestamp: Date.now()
    });
  }

  // Get market data from appropriate source based on pair type
  async getMarketData(pair, timeframe, pairType = 'crypto', limit = 100) {
    try {
      const cacheKey = `${pair}_${timeframe}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.data;
      }

      let data;
      
      if (pairType === 'crypto') {
        // Use Binance API for crypto pairs
        const interval = this.convertTimeframe(timeframe);
        data = await this.marketDataService.getCryptoHistoricalData(pair, interval, limit);
      } else {
        // Use forex data service for forex pairs including Gold
        const interval = this.convertTimeframe(timeframe);
        data = await this.marketDataService.getForexHistoricalData(pair, interval, limit);
      }

      if (!data || data.length === 0) {
        console.warn(`No data received for ${pair} ${timeframe}`);
        return null;
      }

      // Cache the data
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      // Save to database for historical reference
      await this.saveMarketData(pair, timeframe, data);

      return data;
    } catch (error) {
      console.error(`Error fetching market data for ${pair}:`, error.message);
      // Return mock data as fallback
      return this.marketDataService.generateMockHistoricalData(pair, limit);
    }
  }

  // Convert timeframe to Binance format
  convertTimeframe(timeframe) {
    const mapping = {
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h'
    };
    return mapping[timeframe] || '15m';
  }

  // Save market data to MongoDB
  async saveMarketData(pair, timeframe, data) {
    try {
      await MarketData.findOneAndUpdate(
        { pair, timeframe },
        { data, timestamp: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving market data:', error.message);
    }
  }

  // Calculate technical indicators with enhanced analysis
  calculateIndicators(data) {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);
    const opens = data.map(d => d.open);

    try {
      // RSI (14 period)
      const rsi = RSI.calculate({
        values: closes,
        period: 14
      });

      // MACD (12, 26, 9)
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });

      // Multiple EMAs for trend analysis
      const ema9 = EMA.calculate({ values: closes, period: 9 });
      const ema12 = EMA.calculate({ values: closes, period: 12 });
      const ema20 = EMA.calculate({ values: closes, period: 20 });
      const ema26 = EMA.calculate({ values: closes, period: 26 });
      const ema50 = EMA.calculate({ values: closes, period: 50 });
      const ema200 = EMA.calculate({ values: closes, period: 200 });

      // SMAs for additional confirmation
      const sma20 = SMA.calculate({ values: closes, period: 20 });
      const sma50 = SMA.calculate({ values: closes, period: 50 });

      // Bollinger Bands (20, 2)
      const bb = BollingerBands.calculate({
        values: closes,
        period: 20,
        stdDev: 2
      });

      // Stochastic Oscillator
      const stochastic = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14,
        signalPeriod: 3
      });

      // ATR for volatility
      const atr = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14
      });

      // ADX for trend strength
      const adx = ADX.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14
      });

      // Calculate price action patterns
      const priceAction = this.analyzePriceAction(data.slice(-10)); // Last 10 candles
      
      // Calculate volume analysis
      const volumeAnalysis = this.analyzeVolume(data.slice(-20)); // Last 20 candles

      return {
        rsi: rsi[rsi.length - 1] || 50,
        macd: macd[macd.length - 1] || { MACD: 0, signal: 0, histogram: 0 },
        ema9: ema9[ema9.length - 1] || closes[closes.length - 1],
        ema12: ema12[ema12.length - 1] || closes[closes.length - 1],
        ema20: ema20[ema20.length - 1] || closes[closes.length - 1],
        ema26: ema26[ema26.length - 1] || closes[closes.length - 1],
        ema50: ema50[ema50.length - 1] || closes[closes.length - 1],
        ema200: ema200[ema200.length - 1] || closes[closes.length - 1],
        sma20: sma20[sma20.length - 1] || closes[closes.length - 1],
        sma50: sma50[sma50.length - 1] || closes[closes.length - 1],
        bollinger: bb[bb.length - 1] || { upper: 0, middle: 0, lower: 0 },
        stochastic: stochastic[stochastic.length - 1] || { k: 50, d: 50 },
        atr: atr[atr.length - 1] || closes[closes.length - 1] * 0.02,
        adx: adx[adx.length - 1] || { adx: 25, pdi: 25, mdi: 25 },
        priceAction,
        volumeAnalysis,
        volume: volumes[volumes.length - 1] || 0,
        currentPrice: closes[closes.length - 1],
        previousPrice: closes[closes.length - 2] || closes[closes.length - 1]
      };
    } catch (error) {
      console.error('Error calculating indicators:', error.message);
      return null;
    }
  }

  // Analyze price action patterns
  analyzePriceAction(recentData) {
    if (!recentData || recentData.length < 3) {
      return { pattern: 'insufficient_data', strength: 0 };
    }

    const last3 = recentData.slice(-3);
    const higherHighs = last3[2].high > last3[1].high && last3[1].high > last3[0].high;
    const lowerLows = last3[2].low < last3[1].low && last3[1].low < last3[0].low;
    const higherLows = last3[2].low > last3[1].low && last3[1].low > last3[0].low;
    const lowerHighs = last3[2].high < last3[1].high && last3[1].high < last3[0].high;

    if (higherHighs && higherLows) {
      return { pattern: 'uptrend', strength: 0.8 };
    } else if (lowerLows && lowerHighs) {
      return { pattern: 'downtrend', strength: 0.8 };
    } else if (higherLows && lowerHighs) {
      return { pattern: 'consolidation', strength: 0.6 };
    }

    return { pattern: 'neutral', strength: 0.4 };
  }

  // Analyze volume patterns
  analyzeVolume(recentData) {
    if (!recentData || recentData.length < 5) {
      return { trend: 'neutral', strength: 0 };
    }

    const volumes = recentData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes[volumes.length - 1];
    const volumeRatio = recentVolume / avgVolume;

    if (volumeRatio > 1.5) {
      return { trend: 'increasing', strength: 0.8 };
    } else if (volumeRatio < 0.7) {
      return { trend: 'decreasing', strength: 0.6 };
    }

    return { trend: 'stable', strength: 0.5 };
  }

  // Enhanced AI-based signal generation logic
  generateSignalLogic(indicators, data) {
    const { 
      rsi, macd, ema9, ema20, ema50, ema200, sma20, sma50, 
      bollinger, stochastic, atr, adx, priceAction, volumeAnalysis, 
      currentPrice, previousPrice 
    } = indicators;
    
    let signal = 'HOLD';
    let confidence = 'Low';
    let reasoning = [];
    let score = 0;
    let trendStrength = 0;
    
    // 1. Trend Analysis (Weight: 30%)
    const trendScore = this.analyzeTrend(indicators);
    score += trendScore.score * 0.3;
    reasoning.push(...trendScore.reasons);
    trendStrength = trendScore.strength;
    
    // 2. Momentum Analysis (Weight: 25%)
    const momentumScore = this.analyzeMomentum(indicators);
    score += momentumScore.score * 0.25;
    reasoning.push(...momentumScore.reasons);
    
    // 3. Mean Reversion Analysis (Weight: 20%)
    const reversionScore = this.analyzeMeanReversion(indicators);
    score += reversionScore.score * 0.2;
    reasoning.push(...reversionScore.reasons);
    
    // 4. Volume Confirmation (Weight: 15%)
    const volumeScore = this.analyzeVolumeConfirmation(indicators);
    score += volumeScore.score * 0.15;
    reasoning.push(...volumeScore.reasons);
    
    // 5. Price Action Confirmation (Weight: 10%)
    const priceActionScore = this.analyzePriceActionConfirmation(indicators);
    score += priceActionScore.score * 0.1;
    reasoning.push(...priceActionScore.reasons);
    
    // Determine signal and confidence based on score and trend strength
    const normalizedScore = Math.max(-10, Math.min(10, score));
    
    if (normalizedScore >= 6 && trendStrength > 0.6) {
      signal = 'BUY';
      confidence = 'High';
    } else if (normalizedScore >= 3 && trendStrength > 0.4) {
      signal = 'BUY';
      confidence = 'Medium';
    } else if (normalizedScore >= 1.5) {
      signal = 'BUY';
      confidence = 'Low';
    } else if (normalizedScore <= -6 && trendStrength > 0.6) {
      signal = 'SELL';
      confidence = 'High';
    } else if (normalizedScore <= -3 && trendStrength > 0.4) {
      signal = 'SELL';
      confidence = 'Medium';
    } else if (normalizedScore <= -1.5) {
      signal = 'SELL';
      confidence = 'Low';
    }
    
    // Calculate dynamic target and stop loss based on ATR and volatility
    const volatilityMultiplier = this.getVolatilityMultiplier(atr, currentPrice);
    const targetPrice = signal === 'BUY' ? 
      currentPrice * (1 + (0.02 * volatilityMultiplier)) : 
      currentPrice * (1 - (0.02 * volatilityMultiplier));
    const stopLoss = signal === 'BUY' ? 
      currentPrice * (1 - (0.015 * volatilityMultiplier)) : 
      currentPrice * (1 + (0.015 * volatilityMultiplier));
    
    return {
      signal,
      confidence,
      reasoning: reasoning.filter(r => r).join(', '),
      targetPrice: parseFloat(targetPrice.toFixed(8)),
      stopLoss: parseFloat(stopLoss.toFixed(8)),
      score: normalizedScore
    };
  }

  // Analyze trend strength and direction
  analyzeTrend(indicators) {
    const { ema9, ema20, ema50, ema200, adx, priceAction, currentPrice } = indicators;
    let score = 0;
    let reasons = [];
    let strength = 0;
    
    // EMA alignment for trend
    if (ema9 > ema20 && ema20 > ema50 && ema50 > ema200) {
      score += 3;
      strength += 0.8;
      reasons.push('Strong bullish EMA alignment');
    } else if (ema9 < ema20 && ema20 < ema50 && ema50 < ema200) {
      score -= 3;
      strength += 0.8;
      reasons.push('Strong bearish EMA alignment');
    } else if (ema9 > ema20 && ema20 > ema50) {
      score += 2;
      strength += 0.6;
      reasons.push('Bullish short-term trend');
    } else if (ema9 < ema20 && ema20 < ema50) {
      score -= 2;
      strength += 0.6;
      reasons.push('Bearish short-term trend');
    }
    
    // ADX trend strength
    if (adx.adx > 25) {
      strength += 0.3;
      if (adx.pdi > adx.mdi) {
        score += 1;
        reasons.push('Strong uptrend (ADX > 25)');
      } else {
        score -= 1;
        reasons.push('Strong downtrend (ADX > 25)');
      }
    }
    
    // Price action confirmation
    if (priceAction.pattern === 'uptrend') {
      score += 1;
      strength += priceAction.strength * 0.2;
      reasons.push('Bullish price action pattern');
    } else if (priceAction.pattern === 'downtrend') {
      score -= 1;
      strength += priceAction.strength * 0.2;
      reasons.push('Bearish price action pattern');
    }
    
    return { score, reasons, strength: Math.min(1, strength) };
  }

  // Analyze momentum indicators
  analyzeMomentum(indicators) {
    const { rsi, macd, stochastic } = indicators;
    let score = 0;
    let reasons = [];
    
    // RSI momentum
    if (rsi > 50 && rsi < 70) {
      score += 1;
      reasons.push('RSI showing bullish momentum');
    } else if (rsi < 50 && rsi > 30) {
      score -= 1;
      reasons.push('RSI showing bearish momentum');
    } else if (rsi >= 70) {
      score -= 0.5;
      reasons.push('RSI overbought warning');
    } else if (rsi <= 30) {
      score += 0.5;
      reasons.push('RSI oversold opportunity');
    }
    
    // MACD momentum
    if (macd.MACD > macd.signal && macd.histogram > 0) {
      score += 2;
      reasons.push('MACD bullish crossover');
    } else if (macd.MACD < macd.signal && macd.histogram < 0) {
      score -= 2;
      reasons.push('MACD bearish crossover');
    } else if (macd.histogram > 0) {
      score += 1;
      reasons.push('MACD histogram positive');
    } else if (macd.histogram < 0) {
      score -= 1;
      reasons.push('MACD histogram negative');
    }
    
    // Stochastic momentum
    if (stochastic.k > stochastic.d && stochastic.k < 80) {
      score += 1;
      reasons.push('Stochastic bullish crossover');
    } else if (stochastic.k < stochastic.d && stochastic.k > 20) {
      score -= 1;
      reasons.push('Stochastic bearish crossover');
    }
    
    return { score, reasons };
  }

  // Analyze mean reversion opportunities
  analyzeMeanReversion(indicators) {
    const { bollinger, currentPrice, sma20, rsi } = indicators;
    let score = 0;
    let reasons = [];
    
    // Bollinger Bands mean reversion
    const bbPosition = (currentPrice - bollinger.lower) / (bollinger.upper - bollinger.lower);
    
    if (bbPosition <= 0.1 && rsi < 35) {
      score += 2;
      reasons.push('Strong oversold mean reversion setup');
    } else if (bbPosition >= 0.9 && rsi > 65) {
      score -= 2;
      reasons.push('Strong overbought mean reversion setup');
    } else if (bbPosition <= 0.2) {
      score += 1;
      reasons.push('Oversold near lower BB');
    } else if (bbPosition >= 0.8) {
      score -= 1;
      reasons.push('Overbought near upper BB');
    }
    
    // Distance from SMA20
    const smaDistance = (currentPrice - sma20) / sma20;
    if (Math.abs(smaDistance) > 0.03) {
      if (smaDistance < 0) {
        score += 0.5;
        reasons.push('Price significantly below SMA20');
      } else {
        score -= 0.5;
        reasons.push('Price significantly above SMA20');
      }
    }
    
    return { score, reasons };
  }

  // Analyze volume confirmation
  analyzeVolumeConfirmation(indicators) {
    const { volumeAnalysis } = indicators;
    let score = 0;
    let reasons = [];
    
    if (volumeAnalysis.trend === 'increasing' && volumeAnalysis.strength > 0.7) {
      score += 1;
      reasons.push('Strong volume confirmation');
    } else if (volumeAnalysis.trend === 'decreasing') {
      score -= 0.5;
      reasons.push('Weak volume confirmation');
    }
    
    return { score, reasons };
  }

  // Analyze price action confirmation
  analyzePriceActionConfirmation(indicators) {
    const { priceAction, currentPrice, previousPrice } = indicators;
    let score = 0;
    let reasons = [];
    
    const priceChange = (currentPrice - previousPrice) / previousPrice;
    
    if (priceAction.pattern === 'uptrend' && priceChange > 0) {
      score += 1;
      reasons.push('Price action confirms upward momentum');
    } else if (priceAction.pattern === 'downtrend' && priceChange < 0) {
      score -= 1;
      reasons.push('Price action confirms downward momentum');
    }
    
    return { score, reasons };
  }

  // Get volatility multiplier for dynamic targets
  getVolatilityMultiplier(atr, currentPrice) {
    const atrPercent = (atr / currentPrice) * 100;
    
    if (atrPercent > 5) return 2.0; // High volatility
    if (atrPercent > 3) return 1.5; // Medium volatility
    if (atrPercent > 1) return 1.0; // Normal volatility
    return 0.7; // Low volatility
  }

  // Main signal generation method
  async generateSignal(pair, timeframe) {
    try {
      // Determine pair type (crypto or forex)
      const pairType = this.getPairType(pair);
      
      // Get market data
      const data = await this.getMarketData(pair, timeframe, pairType);
      if (!data || data.length < 50) {
        console.warn(`Insufficient data for ${pair} ${timeframe}`);
        return null;
      }

      const indicators = this.calculateIndicators(data);
      if (!indicators) {
        return null;
      }

      const signalData = this.generateSignalLogic(indicators, data);
      
      // Only return signals with at least Low confidence
      if (!signalData.signal) {
        return null;
      }

      const signal = {
        pair,
        signal: signalData.signal,
        price: indicators.currentPrice,
        confidence: signalData.confidence,
        timeframe,
        timestamp: new Date(),
        pairType,
        indicators: {
          rsi: indicators.rsi,
          macd: {
            macd: indicators.macd.MACD,
            signal: indicators.macd.signal,
            histogram: indicators.macd.histogram
          },
          ema: {
            ema12: indicators.ema12,
            ema26: indicators.ema26
          },
          bollinger: indicators.bollinger,
          volume: indicators.volume
        },
        reasoning: signalData.reasoning,
        targetPrice: signalData.targetPrice,
        stopLoss: signalData.stopLoss
      };

      // Avoid duplicate signals
      if (this.isValidNewSignal(signal)) {
        this.cacheSignal(signal);
        return signal;
      }
      
      return null;
    } catch (error) {
      console.error(`Error generating signal for ${pair} ${timeframe}:`, error.message);
      return null;
    }
  }
}

module.exports = SignalGenerator;
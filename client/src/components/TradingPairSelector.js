import React, { useState, useEffect } from 'react';
import './TradingPairSelector.css';
import ApiService from '../services/ApiService';

const TradingPairSelector = ({ selectedPair, onPairChange, disabled = false, licenseValid = false }) => {
  const [pairs, setPairs] = useState({ crypto: [], forex: [], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (licenseValid) {
      fetchTradingPairs();
    } else {
      // Set fallback pairs when license is not valid
      setPairs({
        crypto: [
          { symbol: 'BTCUSDT', displayName: 'BTC/USDT', type: 'crypto' },
          { symbol: 'ETHUSDT', displayName: 'ETH/USDT', type: 'crypto' },
          { symbol: 'BNBUSDT', displayName: 'BNB/USDT', type: 'crypto' }
        ],
        forex: [
          { symbol: 'XAUUSD', displayName: 'Gold/USD', type: 'commodity' },
          { symbol: 'EURUSD', displayName: 'EUR/USD', type: 'forex' }
        ],
        all: [
          { symbol: 'BTCUSDT', displayName: 'BTC/USDT', type: 'crypto' },
          { symbol: 'ETHUSDT', displayName: 'ETH/USDT', type: 'crypto' },
          { symbol: 'BNBUSDT', displayName: 'BNB/USDT', type: 'crypto' },
          { symbol: 'XAUUSD', displayName: 'Gold/USD', type: 'commodity' },
          { symbol: 'EURUSD', displayName: 'EUR/USD', type: 'forex' }
        ]
      });
      setLoading(false);
    }
  }, [licenseValid]);

  const fetchTradingPairs = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/pairs');
      
      if (response.data.success) {
        setPairs(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to fetch trading pairs');
      }
    } catch (err) {
      console.error('Error fetching trading pairs:', err);
      setError(err.message);
      // Set fallback pairs
      setPairs({
        crypto: [
          { symbol: 'BTCUSDT', displayName: 'BTC/USDT', type: 'crypto' },
          { symbol: 'ETHUSDT', displayName: 'ETH/USDT', type: 'crypto' },
          { symbol: 'BNBUSDT', displayName: 'BNB/USDT', type: 'crypto' }
        ],
        forex: [
          { symbol: 'XAUUSD', displayName: 'Gold/USD', type: 'commodity' },
          { symbol: 'EURUSD', displayName: 'EUR/USD', type: 'forex' }
        ],
        all: [
          { symbol: 'BTCUSDT', displayName: 'BTC/USDT', type: 'crypto' },
          { symbol: 'ETHUSDT', displayName: 'ETH/USDT', type: 'crypto' },
          { symbol: 'BNBUSDT', displayName: 'BNB/USDT', type: 'crypto' },
          { symbol: 'XAUUSD', displayName: 'Gold/USD', type: 'commodity' },
          { symbol: 'EURUSD', displayName: 'EUR/USD', type: 'forex' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPairs = () => {
    let pairsToShow = [];
    
    switch (activeTab) {
      case 'crypto':
        pairsToShow = pairs.crypto;
        break;
      case 'forex':
        pairsToShow = pairs.forex;
        break;
      default:
        pairsToShow = pairs.all;
    }

    if (searchTerm) {
      return pairsToShow.filter(pair => 
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return pairsToShow;
  };

  const handlePairSelect = (pair) => {
    onPairChange(pair.symbol);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const getSelectedPairInfo = () => {
    const pair = pairs.all.find(p => p.symbol === selectedPair);
    return pair || { symbol: selectedPair, displayName: selectedPair, type: 'unknown' };
  };

  const getPairTypeIcon = (type) => {
    switch (type) {
      case 'crypto':
        return '₿';
      case 'commodity':
        return '🥇';
      case 'forex':
        return '💱';
      default:
        return '📈';
    }
  };

  const getPairTypeColor = (type) => {
    switch (type) {
      case 'crypto':
        return '#f7931a';
      case 'commodity':
        return '#ffd700';
      case 'forex':
        return '#4caf50';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <div className="trading-pair-selector loading">
        <div className="loading-spinner"></div>
        <span>Loading pairs...</span>
      </div>
    );
  }

  const selectedPairInfo = getSelectedPairInfo();
  const filteredPairs = getFilteredPairs();

  return (
    <div className="trading-pair-selector">
      <label className="pair-selector-label">Trading Pair</label>
      
      <div className={`pair-selector-dropdown ${disabled ? 'disabled' : ''}`}>
        <button 
          className="pair-selector-button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
        >
          <span className="pair-icon" style={{ color: getPairTypeColor(selectedPairInfo.type) }}>
            {getPairTypeIcon(selectedPairInfo.type)}
          </span>
          <span className="pair-name">{selectedPairInfo.displayName}</span>
          <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isDropdownOpen && (
          <div className="pair-dropdown-menu">
            <div className="dropdown-header">
              <input
                type="text"
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pair-search-input"
                autoFocus
              />
            </div>

            <div className="dropdown-tabs">
              <button 
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({pairs.all.length})
              </button>
              <button 
                className={`tab-button ${activeTab === 'crypto' ? 'active' : ''}`}
                onClick={() => setActiveTab('crypto')}
              >
                Crypto ({pairs.crypto.length})
              </button>
              <button 
                className={`tab-button ${activeTab === 'forex' ? 'active' : ''}`}
                onClick={() => setActiveTab('forex')}
              >
                Forex & Gold ({pairs.forex.length})
              </button>
            </div>

            <div className="dropdown-content">
              {filteredPairs.length === 0 ? (
                <div className="no-results">
                  {searchTerm ? 'No pairs found' : 'No pairs available'}
                </div>
              ) : (
                filteredPairs.map((pair) => (
                  <button
                    key={pair.symbol}
                    className={`pair-option ${pair.symbol === selectedPair ? 'selected' : ''}`}
                    onClick={() => handlePairSelect(pair)}
                  >
                    <span className="pair-icon" style={{ color: getPairTypeColor(pair.type) }}>
                      {getPairTypeIcon(pair.type)}
                    </span>
                    <div className="pair-info">
                      <span className="pair-display-name">{pair.displayName}</span>
                      <span className="pair-symbol">{pair.symbol}</span>
                    </div>
                    <span className="pair-type">{pair.type}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={fetchTradingPairs} className="retry-button">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingPairSelector;
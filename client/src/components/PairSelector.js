import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
} from '@mui/material';
import ApiService from '../services/ApiService';

const PairSelector = ({ selectedPair, onPairChange, licenseValid = false }) => {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (licenseValid) {
      loadPairs();
    } else {
      // Use fallback pairs when license is not valid
      setPairs(['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT']);
      setLoading(false);
    }
  }, [licenseValid]);

  const loadPairs = async () => {
    try {
      const pairsData = await ApiService.getPairs();
      setPairs(pairsData);
    } catch (error) {
      console.error('Error loading pairs:', error);
      // Fallback pairs
      setPairs(['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT']);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    onPairChange(event.target.value);
  };

  const formatPairName = (pair) => {
    // Convert BTCUSDT to BTC/USDT
    if (pair.endsWith('USDT')) {
      const base = pair.slice(0, -4);
      return `${base}/USDT`;
    }
    return pair;
  };

  const getPairIcon = (pair) => {
    const base = pair.replace('USDT', '').toLowerCase();
    const iconMap = {
      'btc': '₿',
      'eth': 'Ξ',
      'ada': '₳',
      'dot': '●',
      'link': '🔗',
      'bnb': '🔶',
      'xrp': '◆',
      'sol': '◉'
    };
    return iconMap[base] || '●';
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="pair-selector-label">Trading Pair</InputLabel>
      <Select
        labelId="pair-selector-label"
        value={selectedPair}
        label="Trading Pair"
        onChange={handleChange}
        disabled={loading}
      >
        {pairs.map((pair) => (
          <MenuItem key={pair} value={pair}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography component="span" sx={{ fontSize: '1.2em' }}>
                {getPairIcon(pair)}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatPairName(pair)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PairSelector;
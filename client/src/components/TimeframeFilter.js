import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Box,
  Chip,
  Typography
} from '@mui/material';
import ApiService from '../services/ApiService';

const TimeframeFilter = ({ selectedTimeframes, onTimeframeChange, licenseValid = false }) => {
  const [timeframes, setTimeframes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (licenseValid) {
      loadTimeframes();
    } else {
      // Set fallback timeframes when license is not valid
      setTimeframes([
        { value: '5m', label: '5 Minutes' },
        { value: '15m', label: '15 Minutes' },
        { value: '30m', label: '30 Minutes' },
        { value: '1h', label: '1 Hour' }
      ]);
      setLoading(false);
    }
  }, [licenseValid]);

  const loadTimeframes = async () => {
    try {
      const response = await ApiService.getTimeframes();
      const timeframesData = Array.isArray(response?.data) ? response.data : response;
      
      // Convert simple array to objects with value and label
      const formattedTimeframes = Array.isArray(timeframesData) 
        ? timeframesData.map(tf => ({
            value: tf,
            label: {
              '5m': '5 Minutes',
              '15m': '15 Minutes', 
              '30m': '30 Minutes',
              '1h': '1 Hour'
            }[tf] || tf
          }))
        : [
            { value: '5m', label: '5 Minutes' },
            { value: '15m', label: '15 Minutes' },
            { value: '30m', label: '30 Minutes' },
            { value: '1h', label: '1 Hour' }
          ];
      
      setTimeframes(formattedTimeframes);
    } catch (error) {
      console.error('Error loading timeframes:', error);
      // Fallback timeframes
      setTimeframes([
        { value: '5m', label: '5 Minutes' },
        { value: '15m', label: '15 Minutes' },
        { value: '30m', label: '30 Minutes' },
        { value: '1h', label: '1 Hour' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const value = event.target.value;
    onTimeframeChange(typeof value === 'string' ? value.split(',') : value);
  };

  const getTimeframeIcon = (timeframe) => {
    const iconMap = {
      '5m': '⚡',
      '15m': '🔥',
      '30m': '📈',
      '1h': '⏰'
    };
    return iconMap[timeframe] || '📊';
  };

  const renderSelectedChips = () => {
    if (selectedTimeframes.length === 0) {
      return <Typography variant="body2" color="text.secondary">Select timeframes</Typography>;
    }

    return (
      <Box display="flex" flexWrap="wrap" gap={0.5}>
        {selectedTimeframes.map((timeframe) => {
          const tf = timeframes.find(t => t.value === timeframe);
          return (
            <Chip
              key={timeframe}
              label={`${getTimeframeIcon(timeframe)} ${tf?.label || timeframe}`}
              size="small"
              variant="outlined"
              color="primary"
            />
          );
        })}
      </Box>
    );
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="timeframe-filter-label">Timeframes</InputLabel>
      <Select
        labelId="timeframe-filter-label"
        multiple
        value={selectedTimeframes}
        onChange={handleChange}
        label="Timeframes"
        disabled={loading}
        renderValue={() => null} // We'll render custom chips below
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
            },
          },
        }}
      >
        {timeframes.map((timeframe) => (
          <MenuItem key={timeframe.value} value={timeframe.value}>
            <Checkbox 
              checked={selectedTimeframes.indexOf(timeframe.value) > -1}
              color="primary"
            />
            <Box display="flex" alignItems="center" gap={1}>
              <Typography component="span" sx={{ fontSize: '1.1em' }}>
                {getTimeframeIcon(timeframe.value)}
              </Typography>
              <ListItemText primary={timeframe.label} />
            </Box>
          </MenuItem>
        ))}
      </Select>
      
      {/* Custom display of selected timeframes */}
      <Box mt={1}>
        {renderSelectedChips()}
      </Box>
    </FormControl>
  );
};

export default TimeframeFilter;
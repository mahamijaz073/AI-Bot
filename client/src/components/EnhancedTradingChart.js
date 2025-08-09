import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip, Paper } from '@mui/material';
import { createChart, ColorType } from 'lightweight-charts';
import ApiService from '../services/ApiService';

const EnhancedTradingChart = ({ pair, timeframe, signals, height = 600, licenseValid = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const volumeSeriesRef = useRef();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get(`/pairs/history/${pair}?interval=${timeframe}&limit=200`);
      
      if (response.data.success && response.data.data) {
        setMarketData(response.data.data.data);
        
        // Calculate price change
        if (response.data.data.data.length >= 2) {
          const latest = response.data.data.data[response.data.data.data.length - 1];
          const previous = response.data.data.data[response.data.data.data.length - 2];
          setCurrentPrice(latest.close);
          setPriceChange({
            absolute: latest.close - previous.close,
            percentage: ((latest.close - previous.close) / previous.close) * 100
          });
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch market data');
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#0a0a0a' },
          textColor: '#ffffff',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: '#758696',
            style: 2,
          },
          horzLine: {
            width: 1,
            color: '#758696',
            style: 2,
          },
        },
        rightPriceScale: {
          borderColor: '#2a2a2a',
          textColor: '#ffffff',
        },
        timeScale: {
          borderColor: '#2a2a2a',
          textColor: '#ffffff',
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: height - 100, // Leave space for info panel
      });

      // Candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00e676',
        downColor: '#ff5722',
        borderDownColor: '#ff5722',
        borderUpColor: '#00e676',
        wickDownColor: '#ff5722',
        wickUpColor: '#00e676',
        priceFormat: {
          type: 'price',
          precision: pair.includes('JPY') ? 3 : pair.includes('XAU') ? 2 : 5,
          minMove: pair.includes('JPY') ? 0.001 : pair.includes('XAU') ? 0.01 : 0.00001,
        },
      });

      // Volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
      };
    } catch (err) {
      console.error('Error creating chart:', err);
      setError('Failed to create chart');
    }
  }, [height, pair]);

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !marketData.length) {
      return;
    }

    try {
      // Format candlestick data
      const candleData = marketData.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }));

      // Format volume data
      const volumeData = marketData.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        value: parseFloat(candle.volume || 0),
        color: parseFloat(candle.close) >= parseFloat(candle.open) ? '#00e67640' : '#ff572240',
      }));

      // Set data
      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error('Error updating chart data:', err);
      setError('Failed to update chart data');
    }
  }, [marketData]);

  // Update signal markers
  useEffect(() => {
    if (!candlestickSeriesRef.current || !signals?.length) {
      return;
    }

    try {
      const markers = signals
        .filter(signal => signal.pair === pair)
        .slice(0, 50) // Limit markers for performance
        .map(signal => {
          const time = Math.floor(new Date(signal.timestamp).getTime() / 1000);
          
          let position, color, shape;
          if (signal.signal === 'BUY') {
            position = 'belowBar';
            color = '#00e676';
            shape = 'arrowUp';
          } else if (signal.signal === 'SELL') {
            position = 'aboveBar';
            color = '#ff5722';
            shape = 'arrowDown';
          } else { // HOLD
            position = 'inBar';
            color = '#ffa726';
            shape = 'circle';
          }
          
          return {
            time: time,
            position: position,
            color: color,
            shape: shape,
            text: `${signal.signal}\n${signal.confidence}\n$${signal.price}`,
            size: signal.confidence === 'High' ? 2 : signal.confidence === 'Medium' ? 1.5 : 1,
          };
        })
        .sort((a, b) => a.time - b.time);

      candlestickSeriesRef.current.setMarkers(markers);
    } catch (err) {
      console.error('Error updating signal markers:', err);
    }
  }, [signals, pair]);

  // Fetch data when pair or timeframe changes
  useEffect(() => {
    if (licenseValid) {
      fetchMarketData();
    } else {
      setLoading(false);
      setMarketData([]);
      setCurrentPrice(null);
      setPriceChange(null);
    }
  }, [pair, timeframe, licenseValid]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!licenseValid) return;
    
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000);
    return () => clearInterval(interval);
  }, [pair, timeframe, licenseValid]);

  const formatPrice = (price) => {
    if (!price) return '0.00';
    if (pair.includes('JPY')) return price.toFixed(3);
    if (pair.includes('XAU')) return price.toFixed(2);
    return price.toFixed(5);
  };

  const formatPercentage = (percentage) => {
    if (!percentage) return '0.00%';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6">Chart Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: height }}>
      {/* Price Info Panel */}
      <Paper sx={{ p: 2, mb: 1, bgcolor: '#1a1a1a' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5" component="span" sx={{ fontWeight: 'bold', color: 'white' }}>
              {pair}
            </Typography>
            <Chip 
              label={timeframe} 
              size="small" 
              sx={{ ml: 1, bgcolor: '#2a2a2a', color: 'white' }}
            />
          </Box>
          
          {currentPrice && (
            <Box textAlign="right">
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                ${formatPrice(currentPrice)}
              </Typography>
              {priceChange && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: priceChange.percentage >= 0 ? '#00e676' : '#ff5722',
                    fontWeight: 'bold'
                  }}
                >
                  {formatPercentage(priceChange.percentage)} 
                  ({priceChange.absolute >= 0 ? '+' : ''}{formatPrice(priceChange.absolute)})
                </Typography>
              )}
            </Box>
          )}
        </Box>
        
        {/* Signal Summary */}
        {signals?.length > 0 && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              Recent Signals: 
            </Typography>
            {signals.slice(0, 3).map((signal, index) => {
              let bgcolor, color, borderColor;
              if (signal.signal === 'BUY') {
                bgcolor = '#00e67620';
                color = '#00e676';
                borderColor = '#00e676';
              } else if (signal.signal === 'SELL') {
                bgcolor = '#ff572220';
                color = '#ff5722';
                borderColor = '#ff5722';
              } else { // HOLD
                bgcolor = '#ffa72620';
                color = '#ffa726';
                borderColor = '#ffa726';
              }
              
              return (
                <Chip
                  key={index}
                  label={`${signal.signal} (${signal.confidence})`}
                  size="small"
                  sx={{
                    ml: 0.5,
                    bgcolor: bgcolor,
                    color: color,
                    border: `1px solid ${borderColor}`,
                  }}
                />
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Chart Container */}
      <Box position="relative" sx={{ height: height - 100 }}>
        {loading && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            justifyContent="center"
            alignItems="center"
            bgcolor="rgba(0,0,0,0.7)"
            zIndex={10}
          >
            <CircularProgress size={40} sx={{ color: '#00e676' }} />
          </Box>
        )}
        
        <Box
          ref={chartContainerRef}
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid #2a2a2a',
          }}
        />
        
        {/* Chart Legend */}
        <Box
          position="absolute"
          bottom={8}
          right={8}
          bgcolor="rgba(0,0,0,0.8)"
          borderRadius={1}
          p={1}
          zIndex={5}
        >
          <Typography variant="caption" color="white" display="block">
            Signals:
          </Typography>
          <Typography variant="caption" color="#00e676" display="block">
            ▲ BUY
          </Typography>
          <Typography variant="caption" color="#ff5722" display="block">
            ▼ SELL
          </Typography>
          <Typography variant="caption" color="#ffa726" display="block">
            ● HOLD
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default EnhancedTradingChart;
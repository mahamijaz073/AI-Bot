import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import moment from 'moment';

const TradingChart = ({ pair, timeframe, marketData, signals, height = 400 }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const volumeSeriesRef = useRef();
  const signalMarkersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#1a1a1a' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2B2B43' },
          horzLines: { color: '#2B2B43' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#485c7b',
        },
        timeScale: {
          borderColor: '#485c7b',
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
      });

      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00e676',
        downColor: '#ff5722',
        borderDownColor: '#ff5722',
        borderUpColor: '#00e676',
        wickDownColor: '#ff5722',
        wickUpColor: '#00e676',
      });

      // Create volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (err) {
      console.error('Error creating chart:', err);
      setError('Failed to create chart');
    }
  }, [height]);

  // Update market data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !marketData?.length) {
      setLoading(false);
      return;
    }

    try {
      // Format data for lightweight-charts
      const candleData = marketData.map(candle => ({
        time: Math.floor(candle.timestamp / 1000), // Convert to seconds
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      const volumeData = marketData.map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        value: candle.volume,
        color: candle.close >= candle.open ? '#00e67680' : '#ff572280',
      }));

      // Set data
      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error updating chart data:', err);
      setError('Failed to update chart data');
      setLoading(false);
    }
  }, [marketData]);

  // Update signal markers
  useEffect(() => {
    if (!candlestickSeriesRef.current || !signals?.length) {
      return;
    }

    try {
      // Clear existing markers
      signalMarkersRef.current.forEach(marker => {
        if (marker.remove) marker.remove();
      });
      signalMarkersRef.current = [];

      // Create markers for signals
      const markers = signals
        .filter(signal => signal.pair === pair)
        .map(signal => {
          const time = Math.floor(new Date(signal.timestamp).getTime() / 1000);
          
          return {
            time: time,
            position: signal.signal === 'BUY' ? 'belowBar' : 'aboveBar',
            color: signal.signal === 'BUY' ? '#00e676' : '#ff5722',
            shape: signal.signal === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: `${signal.signal} (${signal.confidence})`,
            size: signal.confidence === 'High' ? 2 : signal.confidence === 'Medium' ? 1.5 : 1,
          };
        })
        .sort((a, b) => a.time - b.time);

      // Set markers
      candlestickSeriesRef.current.setMarkers(markers);
      signalMarkersRef.current = markers;

    } catch (err) {
      console.error('Error updating signal markers:', err);
    }
  }, [signals, pair]);

  // Add TradingView widget as fallback/enhancement
  const addTradingViewWidget = () => {
    if (window.TradingView) {
      new window.TradingView.widget({
        "width": "100%",
        "height": height,
        "symbol": `BINANCE:${pair}`,
        "interval": timeframe,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "container_id": "tradingview_widget",
        "hide_side_toolbar": false,
        "studies": [
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies",
          "BB@tv-basicstudies"
        ],
        "overrides": {
          "paneProperties.background": "#1a1a1a",
          "paneProperties.vertGridProperties.color": "#2B2B43",
          "paneProperties.horzGridProperties.color": "#2B2B43",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#AAA",
          "mainSeriesProperties.candleStyle.upColor": "#00e676",
          "mainSeriesProperties.candleStyle.downColor": "#ff5722",
          "mainSeriesProperties.candleStyle.drawWick": true,
          "mainSeriesProperties.candleStyle.drawBorder": true,
          "mainSeriesProperties.candleStyle.borderColor": "#378658",
          "mainSeriesProperties.candleStyle.borderUpColor": "#00e676",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ff5722",
          "mainSeriesProperties.candleStyle.wickUpColor": "#00e676",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ff5722"
        }
      });
    }
  };

  // Load TradingView script
  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        // TradingView loaded, can use widget if needed
      };
      document.head.appendChild(script);
    }
  }, []);

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box position="relative" width="100%" height={height}>
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
          bgcolor="rgba(0,0,0,0.5)"
          zIndex={1}
        >
          <CircularProgress size={40} />
        </Box>
      )}
      
      <Box
        ref={chartContainerRef}
        width="100%"
        height={height}
        sx={{
          '& canvas': {
            borderRadius: 1,
          }
        }}
      />
      
      {/* Chart Info Overlay */}
      <Box
        position="absolute"
        top={8}
        left={8}
        bgcolor="rgba(0,0,0,0.7)"
        borderRadius={1}
        p={1}
        zIndex={2}
      >
        <Typography variant="caption" color="white">
          {pair} • {timeframe} • {marketData?.length || 0} candles
        </Typography>
        {signals?.length > 0 && (
          <Typography variant="caption" color="#00e676" display="block">
            {signals.length} signals displayed
          </Typography>
        )}
      </Box>

      {/* Signal Legend */}
      <Box
        position="absolute"
        top={8}
        right={8}
        bgcolor="rgba(0,0,0,0.7)"
        borderRadius={1}
        p={1}
        zIndex={2}
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
      </Box>
    </Box>
  );
};

export default TradingChart;
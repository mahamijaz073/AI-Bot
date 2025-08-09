import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import EnhancedTradingChart from './components/EnhancedTradingChart';
import SignalPanel from './components/SignalPanel';
import TradingPairSelector from './components/TradingPairSelector';
import TimeframeFilter from './components/TimeframeFilter';
import AlertPanel from './components/AlertPanel';
import SignalHistory from './components/SignalHistory';
import Dashboard from './components/Dashboard';
import LicenseActivation from './components/LicenseActivation';
import LicenseStatus from './components/LicenseStatus';
import WebSocketService from './services/WebSocketService';
import ApiService from './services/ApiService';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e676',
    },
    secondary: {
      main: '#ff5722',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
});

function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [selectedTimeframes, setSelectedTimeframes] = useState(['5m', '15m', '30m', '1h']);
  const [signals, setSignals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [licenseStatus, setLicenseStatus] = useState({ isValid: false, loading: true, needsActivation: false });
  const [showLicenseActivation, setShowLicenseActivation] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check license status first
        await checkLicenseStatus();
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setNotification({
          open: true,
          message: 'Failed to initialize application',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  // Initialize WebSocket and load data only after license is validated
  useEffect(() => {
    if (licenseStatus.isValid && !licenseStatus.loading) {
      const initializeWithValidLicense = async () => {
        try {
          // Initialize WebSocket connection
          const wsService = WebSocketService.getInstance();
          
          wsService.connect();
          
          // Set up event listeners
          wsService.onConnectionChange((status) => {
            setConnectionStatus(status);
            if (status === 'connected') {
              // Subscribe to signals for selected pair
              wsService.subscribe(selectedPair, selectedTimeframes);
            }
          });

          wsService.onSignalReceived((signal) => {
            setSignals(prev => [signal, ...prev.slice(0, 99)]); // Keep last 100 signals
            
            // Show notification for high confidence signals
            if (signal.confidence === 'High') {
              setNotification({
                open: true,
                message: `High confidence ${signal.signal} signal for ${signal.pair} at $${signal.price}`,
                severity: signal.signal === 'BUY' ? 'success' : 'warning'
              });
            }
          });

          wsService.onAlertReceived((alert) => {
            setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
            
            setNotification({
              open: true,
              message: alert.message,
              severity: 'info'
            });
          });

          // Load initial data
          await loadInitialData();
          
        } catch (error) {
          console.error('Failed to initialize with valid license:', error);
          setNotification({
            open: true,
            message: 'Failed to load application data',
            severity: 'error'
          });
        }
      };
      
      initializeWithValidLicense();

      return () => {
        const wsService = WebSocketService.getInstance();
        wsService.disconnect();
      };
    }
  }, [licenseStatus.isValid, licenseStatus.loading]);

  useEffect(() => {
    // Update subscription when pair or timeframes change
    if (connectionStatus === 'connected') {
      const wsService = WebSocketService.getInstance();
      wsService.subscribe(selectedPair, selectedTimeframes);
      
      // Load market data for the new pair
      loadMarketData();
    }
  }, [selectedPair, selectedTimeframes, connectionStatus]);

  const checkLicenseStatus = async () => {
    try {
      const response = await fetch('/api/license/status');
      const data = await response.json();
      
      setLicenseStatus({
        isValid: data.valid,
        loading: false,
        needsActivation: !data.valid && !data.hasLicense,
        details: data
      });
      
      if (!data.valid) {
        setShowLicenseActivation(true);
      }
    } catch (error) {
      console.error('Error checking license status:', error);
      setLicenseStatus({
        isValid: false,
        loading: false,
        needsActivation: true,
        details: null
      });
      setShowLicenseActivation(true);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load latest signals
      const signalsResponse = await ApiService.getLatestSignals({
        pairs: [selectedPair],
        timeframes: selectedTimeframes
      });
      setSignals(Array.isArray(signalsResponse?.data) ? signalsResponse.data : []);
      
      // Load recent alerts
      const alertsResponse = await ApiService.getAlerts();
      setAlerts(Array.isArray(alertsResponse?.data) ? alertsResponse.data.slice(0, 20) : []);
      
      // Load market data
      await loadMarketData();
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setNotification({
        open: true,
        message: 'Error loading initial data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseActivated = () => {
    setShowLicenseActivation(false);
    // Reload the page to reinitialize with valid license
    window.location.reload();
  };

  const loadMarketData = async () => {
    try {
      const data = await ApiService.getMarketData(selectedPair, '15m', 100);
      setMarketData(data || []);
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };

  const handlePairChange = (pair) => {
    setSelectedPair(pair);
  };

  const handleTimeframeChange = (timeframes) => {
    setSelectedTimeframes(timeframes);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  const filteredSignals = signals.filter(signal => 
    signal.pair === selectedPair && selectedTimeframes.includes(signal.timeframe)
  );

  // Show license activation if needed
  if (showLicenseActivation) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LicenseActivation 
            open={showLicenseActivation}
            onLicenseActivated={handleLicenseActivated}
            onClose={() => setShowLicenseActivation(false)}
            licenseStatus={licenseStatus}
          />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
        <LicenseStatus 
          status={licenseStatus} 
          onLicenseRequired={() => setShowLicenseActivation(true)}
          onRefresh={checkLicenseStatus}
        />
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              🤖 MD ADNAN MUGHAL BOT
            </Typography>
            <Chip 
              label={`${connectionStatus.toUpperCase()}`}
              color={getConnectionStatusColor()}
              size="small"
              sx={{ mr: 2 }}
            />
            <Typography variant="body2" color="inherit">
              {selectedPair} | {selectedTimeframes.join(', ')}
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
          <Grid container spacing={2}>
            {/* Controls */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <TradingPairSelector 
                      selectedPair={selectedPair}
                      onPairChange={handlePairChange}
                      licenseValid={licenseStatus.isValid}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={9}>
                    <TimeframeFilter 
                      selectedTimeframes={selectedTimeframes}
                      onTimeframeChange={handleTimeframeChange}
                      licenseValid={licenseStatus.isValid}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Dashboard */}
            <Grid item xs={12}>
              <Dashboard 
                signals={filteredSignals}
                alerts={alerts}
                selectedPair={selectedPair}
                loading={loading}
                licenseValid={licenseStatus.isValid}
              />
            </Grid>

            {/* Chart and Signals */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: 600 }}>
                <Typography variant="h6" gutterBottom>
                  📈 Live Chart - {selectedPair}
                </Typography>
                <EnhancedTradingChart 
                  pair={selectedPair}
                  timeframe={selectedTimeframes[0] || '15m'}
                  signals={filteredSignals}
                  height={520}
                  licenseValid={licenseStatus.isValid}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                {/* Live Signals */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="h6" gutterBottom>
                      🎯 Live Signals
                    </Typography>
                    <SignalPanel 
                      signals={filteredSignals.slice(0, 10)}
                      loading={loading}
                    />
                  </Paper>
                </Grid>

                {/* Alerts */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, height: 280 }}>
                    <Typography variant="h6" gutterBottom>
                      🚨 Recent Alerts
                    </Typography>
                    <AlertPanel 
                      alerts={alerts.slice(0, 8)}
                      loading={loading}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* Signal History */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Signal History
                </Typography>
                <SignalHistory 
                  pair={selectedPair}
                  timeframes={selectedTimeframes}
                  licenseValid={licenseStatus.isValid}
                />
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
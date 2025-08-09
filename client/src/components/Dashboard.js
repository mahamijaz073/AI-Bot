import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  NotificationsActive,
  Speed,
  Timeline
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

const Dashboard = ({ signals, alerts, selectedPair, loading, licenseValid = false }) => {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (licenseValid) {
      loadStats();
    } else {
      setStatsLoading(false);
    }
  }, [selectedPair, licenseValid]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await ApiService.getSignalStats({ 
        pair: selectedPair,
        days: 7 
      });
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const getRecentSignalStats = () => {
    if (!signals || signals.length === 0) {
      return { buy: 0, sell: 0, high: 0, medium: 0, low: 0 };
    }

    const recent = signals.slice(0, 20); // Last 20 signals
    return {
      buy: recent.filter(s => s.signal === 'BUY').length,
      sell: recent.filter(s => s.signal === 'SELL').length,
      high: recent.filter(s => s.confidence === 'High').length,
      medium: recent.filter(s => s.confidence === 'Medium').length,
      low: recent.filter(s => s.confidence === 'Low').length
    };
  };

  const getAlertStats = () => {
    if (!alerts || alerts.length === 0) {
      return { total: 0, high: 0, recent: 0 };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return {
      total: alerts.length,
      high: alerts.filter(a => a.confidence === 'High').length,
      recent: alerts.filter(a => new Date(a.timestamp) > oneHourAgo).length
    };
  };

  const recentStats = getRecentSignalStats();
  const alertStats = getAlertStats();

  const StatCard = ({ title, value, subtitle, icon, color = 'primary', loading = false }) => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {loading ? <CircularProgress size={24} /> : value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.disabled">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: `${color}.main`, opacity: 0.7 }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );

  const ProgressCard = ({ title, current, total, color = 'primary' }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight="bold">
            {current}/{total}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({percentage.toFixed(1)}%)
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          color={color}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
        />
      </Paper>
    );
  };

  return (
    <Grid container spacing={2}>
      {/* Recent Signals Overview */}
      <Grid item xs={6} sm={3}>
        <StatCard
          title="Buy Signals"
          value={recentStats.buy}
          subtitle="Last 20 signals"
          icon={<TrendingUp sx={{ fontSize: 32 }} />}
          color="success"
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={6} sm={3}>
        <StatCard
          title="Sell Signals"
          value={recentStats.sell}
          subtitle="Last 20 signals"
          icon={<TrendingDown sx={{ fontSize: 32 }} />}
          color="error"
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={6} sm={3}>
        <StatCard
          title="High Confidence"
          value={recentStats.high}
          subtitle="Recent signals"
          icon={<Speed sx={{ fontSize: 32 }} />}
          color="warning"
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={6} sm={3}>
        <StatCard
          title="Active Alerts"
          value={alertStats.recent}
          subtitle="Last hour"
          icon={<NotificationsActive sx={{ fontSize: 32 }} />}
          color="info"
          loading={loading}
        />
      </Grid>

      {/* Weekly Statistics */}
      {stats && !statsLoading && (
        <>
          <Grid item xs={12} sm={6}>
            <ProgressCard
              title="High Confidence Signals (7 days)"
              current={stats.highConfidenceSignals}
              total={stats.totalSignals}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Signal Distribution (7 days)
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {stats.signalBreakdown?.map((item, index) => (
                  <Chip
                    key={index}
                    label={`${item._id}: ${item.totalCount}`}
                    size="small"
                    color={item._id === 'BUY' ? 'success' : 'error'}
                    variant="outlined"
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                Total: {stats.totalSignals} signals
              </Typography>
            </Paper>
          </Grid>
        </>
      )}

      {/* Current Pair Info */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Assessment sx={{ fontSize: 24, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {selectedPair} Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time AI signal generation active
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip 
                label="AI Active" 
                color="success" 
                size="small"
                icon={<Timeline />}
              />
              <Chip 
                label={`${signals?.length || 0} Signals`} 
                variant="outlined" 
                size="small"
              />
              <Chip 
                label={`${alerts?.length || 0} Alerts`} 
                variant="outlined" 
                size="small"
              />
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
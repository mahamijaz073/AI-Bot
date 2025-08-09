import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Skeleton,
  Alert as MuiAlert
} from '@mui/material';
import {
  NotificationsActive,
  TrendingUp,
  TrendingDown,
  AccessTime,
  PriorityHigh
} from '@mui/icons-material';
import moment from 'moment';

const AlertPanel = ({ alerts = [], loading = false }) => {
  const getAlertIcon = (signal) => {
    return signal === 'BUY' ? <TrendingUp /> : <TrendingDown />;
  };

  const getAlertColor = (confidence) => {
    switch (confidence) {
      case 'High': return '#ff5722';
      case 'Medium': return '#ff9800';
      case 'Low': return '#2196f3';
      default: return '#757575';
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'info';
      default: return 'default';
    }
  };

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  if (loading) {
    return (
      <Box>
        {[...Array(4)].map((_, index) => (
          <Box key={index} mb={1}>
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height={150}
        color="text.secondary"
      >
        <NotificationsActive sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2" align="center">
          No alerts yet
        </Typography>
        <Typography variant="caption" align="center" color="text.disabled">
          High confidence signals will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
      <List dense>
        {alerts.map((alert, index) => (
          <ListItem
            key={`${alert._id || index}-${alert.timestamp}`}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              mb: 1,
              border: `1px solid ${getAlertColor(alert.confidence)}30`,
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Box
                sx={{
                  color: getAlertColor(alert.confidence),
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {alert.confidence === 'High' && <PriorityHigh sx={{ fontSize: 20 }} />}
                {getAlertIcon(alert.signal)}
              </Box>
            </ListItemIcon>
            
            <ListItemText
              primary={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                    {alert.pair}
                  </span>
                  <span
                    style={{
                      backgroundColor: alert.signal === 'BUY' ? '#00e67620' : '#ff572220',
                      color: alert.signal === 'BUY' ? '#00e676' : '#ff5722',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}
                  >
                    {alert.signal}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      border: `1px solid ${getConfidenceColor(alert.confidence) === 'error' ? '#f44336' : getConfidenceColor(alert.confidence) === 'warning' ? '#ff9800' : getConfidenceColor(alert.confidence) === 'info' ? '#2196f3' : '#757575'}`,
                      color: getConfidenceColor(alert.confidence) === 'error' ? '#f44336' : getConfidenceColor(alert.confidence) === 'warning' ? '#ff9800' : getConfidenceColor(alert.confidence) === 'info' ? '#2196f3' : '#757575',
                      display: 'inline-block'
                    }}
                  >
                    {alert.confidence}
                  </span>
                </span>
              }
              secondary={
                <span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.87)', fontWeight: 'medium' }}>
                    {formatPrice(alert.price)}
                  </span>
                  
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <AccessTime sx={{ fontSize: 12 }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                      {moment(alert.timestamp).fromNow()}
                    </span>
                    {alert.timeframe && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          height: '16px',
                          padding: '1px 4px',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.23)',
                          color: 'rgba(0, 0, 0, 0.6)',
                          display: 'inline-block',
                          lineHeight: '14px'
                        }}
                      >
                        {alert.timeframe}
                      </span>
                    )}
                  </span>
                  
                  {alert.message && (
                    <span
                      style={{ 
                        display: 'block',
                        marginTop: '4px',
                        fontStyle: 'italic',
                        fontSize: '0.75rem',
                        color: 'rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%'
                      }}
                      title={alert.message}
                    >
                      {alert.message}
                    </span>
                  )}
                </span>
              }
            />
          </ListItem>
        ))}
      </List>
      
      {alerts.length >= 8 && (
        <Box mt={1} textAlign="center">
          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
            Showing latest 8 alerts
          </span>
        </Box>
      )}
    </Box>
  );
};

export default AlertPanel;
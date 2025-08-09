import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Typography,
  Avatar,
  Divider,
  Skeleton,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney
} from '@mui/icons-material';
import moment from 'moment';

const SignalPanel = ({ signals = [], loading = false }) => {
  const getSignalColor = (signal) => {
    if (signal === 'BUY') return '#00e676';
    if (signal === 'SELL') return '#ff5722';
    return '#ffa726'; // For HOLD
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'High': return 'success';
      case 'Medium': return 'warning';
      case 'Low': return 'default';
      default: return 'default';
    }
  };

  const getSignalIcon = (signal) => {
    if (signal === 'BUY') return <TrendingUp />;
    if (signal === 'SELL') return <TrendingDown />;
    return <AccessTime />; // For HOLD
  };

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatTimeframe = (timeframe) => {
    const mapping = {
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1hr'
    };
    return mapping[timeframe] || timeframe;
  };

  if (loading) {
    return (
      <Box>
        {[...Array(5)].map((_, index) => (
          <Box key={index} mb={2}>
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height={200}
        color="text.secondary"
      >
        <TrendingUp sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="body2" align="center">
          No signals available
        </Typography>
        <Typography variant="caption" align="center" color="text.disabled">
          Waiting for AI to generate new signals...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
      <List dense>
        {signals.map((signal, index) => (
          <React.Fragment key={`signal-${signal._id || `${index}-${Date.now()}`}-${signal.timestamp || index}`}>
            <ListItem
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                mb: 1,
                border: `1px solid ${getSignalColor(signal.signal)}20`,
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: getSignalColor(signal.signal),
                  width: 32,
                  height: 32,
                  mr: 2
                }}
              >
                {getSignalIcon(signal.signal)}
              </Avatar>
              
              <ListItemText
                primary={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                      {signal.signal}
                    </span>
                    <Chip
                      label={signal.confidence}
                      size="small"
                      color={getConfidenceColor(signal.confidence)}
                      variant="outlined"
                    />
                    <Chip
                      label={formatTimeframe(signal.timeframe)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </span>
                }
                secondary={
                  <span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <AttachMoney sx={{ fontSize: 14 }} />
                      <span style={{ fontWeight: 'medium', fontSize: '0.875rem' }}>
                        {formatPrice(signal.price)}
                      </span>
                      {signal.targetPrice && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          → {formatPrice(signal.targetPrice)}
                        </span>
                      )}
                    </span>
                    
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <AccessTime sx={{ fontSize: 14 }} />
                      <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                        {moment(signal.timestamp).fromNow()}
                      </span>
                    </span>
                    
                    {signal.reasoning && (
                      <span
                        style={{ 
                          display: 'block',
                          marginTop: '4px',
                          fontStyle: 'italic',
                          fontSize: '0.75rem',
                          color: 'rgba(0, 0, 0, 0.6)',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={signal.reasoning}
                      >
                        {signal.reasoning}
                      </span>
                    )}
                  </span>
                }
              />
            </ListItem>
            
            {index < signals.length - 1 && (
              <Divider sx={{ my: 0.5, opacity: 0.3 }} />
            )}
          </React.Fragment>
        ))}
      </List>
      
      {signals.length >= 10 && (
        <Box mt={1} textAlign="center">
          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
            Showing latest 10 signals
          </span>
        </Box>
      )}
    </Box>
  );
};

export default SignalPanel;
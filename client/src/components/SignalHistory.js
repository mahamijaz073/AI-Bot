import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Grid,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  FilterList
} from '@mui/icons-material';
import moment from 'moment';
import ApiService from '../services/ApiService';

const SignalHistory = ({ pair, timeframes, licenseValid = false }) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    confidence: '',
    signal: '',
    timeframe: ''
  });

  useEffect(() => {
    if (licenseValid) {
      loadSignals();
    } else {
      setLoading(false);
      setSignals([]);
      setTotalCount(0);
    }
  }, [pair, timeframes, page, rowsPerPage, filters, licenseValid]);

  const loadSignals = async () => {
    try {
      setLoading(true);
      
      const params = {
        pair,
        timeframe: timeframes,
        page: page + 1,
        limit: rowsPerPage,
        ...(filters.confidence && { confidence: filters.confidence }),
        ...(filters.signal && { signal: filters.signal }),
        ...(filters.timeframe && { timeframe: filters.timeframe })
      };

      const response = await ApiService.getSignals(params);
      
      setSignals(response.signals || []);
      setTotalCount(response.pagination?.totalSignals || 0);
    } catch (error) {
      console.error('Error loading signal history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setPage(0);
  };

  const handleRefresh = () => {
    loadSignals();
  };

  const getSignalIcon = (signal) => {
    if (signal === 'BUY') {
      return <TrendingUp sx={{ color: '#00e676', fontSize: 20 }} />;
    } else if (signal === 'SELL') {
      return <TrendingDown sx={{ color: '#ff5722', fontSize: 20 }} />;
    } else {
      return <AccessTime sx={{ color: '#ffa726', fontSize: 20 }} />;
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

  const getSignalColor = (signal) => {
    if (signal === 'BUY') return 'success';
    if (signal === 'SELL') return 'error';
    return 'warning'; // For HOLD
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

  return (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Signal Type"
              value={filters.signal}
              onChange={handleFilterChange('signal')}
            >
              <MenuItem value="">All Signals</MenuItem>
              <MenuItem value="BUY">Buy Only</MenuItem>
              <MenuItem value="SELL">Sell Only</MenuItem>
              <MenuItem value="HOLD">Hold Only</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Confidence"
              value={filters.confidence}
              onChange={handleFilterChange('confidence')}
            >
              <MenuItem value="">All Confidence</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Timeframe"
              value={filters.timeframe}
              onChange={handleFilterChange('timeframe')}
            >
              <MenuItem value="">All Timeframes</MenuItem>
              <MenuItem value="5m">5 Minutes</MenuItem>
              <MenuItem value="15m">15 Minutes</MenuItem>
              <MenuItem value="30m">30 Minutes</MenuItem>
              <MenuItem value="1h">1 Hour</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Tooltip title={loading ? "Refreshing..." : "Refresh"}>
                <span>
                  <IconButton onClick={handleRefresh} disabled={loading}>
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Active Filters">
                <IconButton>
                  <FilterList color={Object.values(filters).some(f => f) ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Signal</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Timeframe</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Stop Loss</TableCell>
              <TableCell>Reasoning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : signals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    No signals found for the selected criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              signals.map((signal, index) => (
                <TableRow key={signal._id || index} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getSignalIcon(signal.signal)}
                      <Chip
                        label={signal.signal}
                        size="small"
                        color={getSignalColor(signal.signal)}
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatPrice(signal.price)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={signal.confidence}
                      size="small"
                      color={getConfidenceColor(signal.confidence)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={formatTimeframe(signal.timeframe)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {moment(signal.timestamp).format('MMM DD, HH:mm')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {moment(signal.timestamp).fromNow()}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    {signal.targetPrice ? (
                      <Typography variant="body2" color="success.main">
                        {formatPrice(signal.targetPrice)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {signal.stopLoss ? (
                      <Typography variant="body2" color="error.main">
                        {formatPrice(signal.stopLoss)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Tooltip title={signal.reasoning || 'No reasoning provided'}>
                      <Typography 
                        variant="body2" 
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'help'
                        }}
                      >
                        {signal.reasoning || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default SignalHistory;
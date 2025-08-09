import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

const LicenseStatus = ({ status, onLicenseRequired, onRefresh }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the status passed as prop
  const licenseStatus = status?.details;
  const loading = status?.loading || false;



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force online validation
      await ApiService.post('/license/validate', { forceOnlineCheck: true });
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error refreshing license:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getLicenseChip = () => {
    if (loading) {
      return (
        <Chip
          icon={<CircularProgress size={16} />}
          label="Checking..."
          size="small"
          variant="outlined"
        />
      );
    }

    if (!licenseStatus) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Unknown"
          color="error"
          size="small"
          onClick={() => onLicenseRequired && onLicenseRequired()}
        />
      );
    }

    if (licenseStatus.hasLicense && licenseStatus.valid) {
      return (
        <Chip
          icon={<CheckIcon />}
          label="Licensed"
          color="success"
          size="small"
          onClick={() => setShowDetails(true)}
        />
      );
    }

    if (licenseStatus.hasLicense && !licenseStatus.valid) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Invalid"
          color="warning"
          size="small"
          onClick={() => onLicenseRequired && onLicenseRequired()}
        />
      );
    }

    return (
      <Chip
        icon={<SecurityIcon />}
        label="Unlicensed"
        color="error"
        size="small"
        onClick={() => onLicenseRequired && onLicenseRequired()}
      />
    );
  };

  const renderLicenseDetails = () => {
    if (!licenseStatus) return null;

    return (
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">License Details</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justify="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Status</Typography>
                <Chip
                  icon={licenseStatus.valid ? <CheckIcon /> : <ErrorIcon />}
                  label={licenseStatus.valid ? 'Active' : 'Invalid'}
                  color={licenseStatus.valid ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              
              {licenseStatus.hasLicense && (
                <>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary">
                      License Key
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                      {licenseStatus.key}
                    </Typography>
                  </Box>
                  
                  {licenseStatus.user_email && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Licensed To
                      </Typography>
                      <Typography variant="body1">
                        {licenseStatus.user_email}
                      </Typography>
                    </Box>
                  )}
                  
                  {licenseStatus.verified_at && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last Verified
                      </Typography>
                      <Typography variant="body1">
                        {new Date(licenseStatus.verified_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status Message
                </Typography>
                <Typography variant="body1">
                  {licenseStatus.status}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {!licenseStatus.valid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Your license is not valid. Some features may be restricted.
                Please contact support or activate a valid license.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowDetails(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip title="Click to view license details or activate">
        {getLicenseChip()}
      </Tooltip>
      
      <Tooltip title={refreshing ? "Refreshing..." : "Refresh license status"}>
        <span>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
      
      {renderLicenseDetails()}
    </Box>
  );
};

export default LicenseStatus;
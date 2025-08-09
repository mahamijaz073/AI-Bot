import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

const LicenseActivation = ({ open, onClose, onLicenseActivated, licenseStatus }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Remove the automatic license status check since it's handled by parent component
  // const checkLicenseStatus = async () => {
  //   // This is now handled by the parent App component
  // };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await ApiService.post('/license/activate', {
        licenseKey: licenseKey.trim(),
        userEmail: userEmail.trim()
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTimeout(() => {
          onLicenseActivated();
        }, 2000);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Failed to activate license. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOnly = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await ApiService.post('/license/verify', {
        licenseKey: licenseKey.trim()
      });

      if (response.data.valid) {
        setSuccess('License key is valid!');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Failed to verify license. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatLicenseKey = (value) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Add hyphens every 3 characters
    const formatted = cleaned.match(/.{1,3}/g)?.join('-') || cleaned;
    
    // Allow up to 17 characters (XXX-XXX-XXX-XXX format)
    return formatted.substring(0, 17);
  };

  const handleLicenseKeyChange = (e) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
  };

  const renderLicenseStatus = () => {
    if (!licenseStatus) return null;

    if (licenseStatus.hasLicense && licenseStatus.valid) {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle2">License Active</Typography>
            <Typography variant="body2">
              Key: {licenseStatus.key}
            </Typography>
            <Typography variant="body2">
              Email: {licenseStatus.user_email}
            </Typography>
            <Typography variant="caption">
              Verified: {new Date(licenseStatus.verified_at).toLocaleString()}
            </Typography>
          </Box>
        </Alert>
      );
    }

    if (licenseStatus.hasLicense && !licenseStatus.valid) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">License Invalid</Typography>
          <Typography variant="body2">{licenseStatus.status}</Typography>
        </Alert>
      );
    }

    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">No License Found</Typography>
        <Typography variant="body2">Please enter your license key to activate the bot.</Typography>
      </Alert>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">License Activation</Typography>

        </Box>
      </DialogTitle>
      
      <DialogContent>
        {renderLicenseStatus()}
        
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <KeyIcon color="primary" />
              <Typography variant="h6">Enter License Key</Typography>
            </Box>
            
            <TextField
              fullWidth
              label="License Key"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="XXX-XXX-XXX-XXX"
              variant="outlined"
              sx={{ mb: 2 }}
              inputProps={{
                style: { 
                  fontFamily: 'monospace', 
                  fontSize: '1.1rem',
                  letterSpacing: '2px'
                }
              }}
              helperText="Enter your license key (format: XXX-XXX-XXX-XXX)"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EmailIcon color="primary" />
              <Typography variant="h6">Email (Optional)</Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
              variant="outlined"
              helperText="Email associated with your license (optional for activation)"
            />
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <ErrorIcon />
              <Typography>{error}</Typography>
            </Box>
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CheckIcon />
              <Typography>{success}</Typography>
            </Box>
          </Alert>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Need a license key?</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact support to purchase a license for this AI Trading Signal Bot.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleVerifyOnly}
          disabled={loading || !licenseKey.trim()}
          variant="outlined"
        >
          Verify Only
        </Button>
        
        <Button 
          onClick={handleActivate}
          disabled={loading || !licenseKey.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <SecurityIcon />}
        >
          {loading ? 'Activating...' : 'Activate License'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseActivation;
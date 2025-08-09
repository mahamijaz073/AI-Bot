import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Signals API
  async getSignals(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        params[key].forEach(value => queryParams.append(key, value));
      } else if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    return this.client.get(`/signals?${queryParams.toString()}`);
  }

  async getSignalsByPair(pair, params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        params[key].forEach(value => queryParams.append(key, value));
      } else if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    return this.client.get(`/signals/pair/${pair}?${queryParams.toString()}`);
  }

  async getLatestSignals(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.pairs) {
      params.pairs.forEach(pair => queryParams.append('pairs', pair));
    }
    if (params.timeframes) {
      params.timeframes.forEach(tf => queryParams.append('timeframes', tf));
    }

    return this.client.get(`/signals/latest?${queryParams.toString()}`);
  }

  async generateSignal(pair, timeframe) {
    return this.client.post('/signals/generate', { pair, timeframe });
  }

  async getSignalStats(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    return this.client.get(`/signals/stats?${queryParams.toString()}`);
  }

  // Market Data API
  async getMarketData(pair, timeframe, limit = 100) {
    return this.client.get(`/signals/market-data/${pair}/${timeframe}?limit=${limit}`);
  }

  // Alerts API
  async getAlerts(limit = 50) {
    return this.client.get(`/alerts?limit=${limit}`);
  }

  // User Preferences API
  async getUserPreferences(userId = 'default') {
    return this.client.get(`/signals/preferences/${userId}`);
  }

  async updateUserPreferences(preferences, userId = 'default') {
    return this.client.put(`/signals/preferences/${userId}`, preferences);
  }

  // General API
  async get(url, params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        params[key].forEach(value => queryParams.append(key, value));
      } else if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.client.get(fullUrl);
  }

  async post(url, data = {}) {
    return this.client.post(url, data);
  }

  async put(url, data = {}) {
    return this.client.put(url, data);
  }

  async delete(url) {
    return this.client.delete(url);
  }

  async getPairs() {
    return this.client.get('/pairs');
  }

  async getTimeframes() {
    return this.client.get('/timeframes');
  }

  // Utility methods
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return { status: 'ok', ...response };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Batch operations
  async batchGetSignals(requests) {
    try {
      const promises = requests.map(request => {
        if (request.type === 'pair') {
          return this.getSignalsByPair(request.pair, request.params);
        } else if (request.type === 'latest') {
          return this.getLatestSignals(request.params);
        } else {
          return this.getSignals(request.params);
        }
      });

      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        request: requests[index],
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    } catch (error) {
      console.error('Batch request error:', error);
      throw error;
    }
  }

  // Cache management
  clearCache() {
    // Clear any client-side cache if implemented
    console.log('API cache cleared');
  }

  // Error handling helpers
  isNetworkError(error) {
    return !error.response && error.code === 'NETWORK_ERROR';
  }

  isTimeoutError(error) {
    return error.code === 'ECONNABORTED';
  }

  isServerError(error) {
    return error.response && error.response.status >= 500;
  }

  isClientError(error) {
    return error.response && error.response.status >= 400 && error.response.status < 500;
  }

  // Retry mechanism
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          break;
        }
        
        // Only retry on network errors or server errors
        if (this.isNetworkError(error) || this.isServerError(error) || this.isTimeoutError(error)) {
          console.log(`Request failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        } else {
          // Don't retry client errors
          break;
        }
      }
    }
    
    throw lastError;
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
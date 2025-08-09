class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.connectionStatus = 'disconnected';
    this.listeners = {
      connectionChange: [],
      signalReceived: [],
      alertReceived: [],
      error: []
    };
    this.subscriptions = {
      pair: null,
      timeframes: []
    };
  }

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.setConnectionStatus('connecting');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:5000`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.setConnectionStatus('connected');
        
        // Resubscribe if we had previous subscriptions
        if (this.subscriptions.pair) {
          this.subscribe(this.subscriptions.pair, this.subscriptions.timeframes);
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('error', error);
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setConnectionStatus('disconnected');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  setConnectionStatus(status) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.notifyListeners('connectionChange', status);
    }
  }

  subscribe(pair, timeframes = []) {
    this.subscriptions.pair = pair;
    this.subscriptions.timeframes = timeframes;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        pair: pair,
        timeframes: timeframes
      };
      
      this.ws.send(JSON.stringify(message));
      console.log('Subscribed to:', pair, timeframes);
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'signals':
        // Initial signals data
        data.data.forEach(signal => {
          this.notifyListeners('signalReceived', signal);
        });
        break;
        
      case 'newSignal':
        // New signal received
        this.notifyListeners('signalReceived', data.data);
        break;
        
      case 'alert':
        // Alert received
        this.notifyListeners('alertReceived', data.data);
        break;
        
      case 'error':
        console.error('Server error:', data.message);
        this.notifyListeners('error', data.message);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Event listener management
  onConnectionChange(callback) {
    this.listeners.connectionChange.push(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
  }

  onSignalReceived(callback) {
    this.listeners.signalReceived.push(callback);
  }

  onAlertReceived(callback) {
    this.listeners.alertReceived.push(callback);
  }

  onError(callback) {
    this.listeners.error.push(callback);
  }

  removeListener(type, callback) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  }

  notifyListeners(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in listener callback:', error);
        }
      });
    }
  }

  // Send custom message
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Get current connection status
  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Check if connected
  isConnected() {
    return this.connectionStatus === 'connected';
  }
}

export default WebSocketService;
# 🤖 AI-Based Accurate Signal Bot

An advanced AI-powered trading signal bot with multi-timeframe support, real-time TradingView chart integration, and MongoDB storage. The bot uses sophisticated technical analysis and machine learning algorithms to generate accurate buy/sell signals for cryptocurrency trading.

## ✨ Features

### 🎯 AI Signal Generation
- **Automated Signal Generation**: AI analyzes price action, indicators, and patterns without manual input
- **Multi-Indicator Analysis**: RSI, MACD, EMA, Bollinger Bands, and volume analysis
- **Smart Confidence Scoring**: High/Medium/Low confidence levels for each signal
- **Real-time Processing**: Signals generated every 30 seconds

### ⏰ Multi-Timeframe Support
- **5 Minutes**: Ultra-short term scalping signals
- **15 Minutes**: Short-term trading opportunities
- **30 Minutes**: Medium-term position signals
- **1 Hour**: Longer-term trend analysis

### 📊 Live TradingView Integration
- **Real-time Charts**: Live price data from Binance API
- **Signal Visualization**: Buy/Sell markers displayed on charts
- **Technical Indicators**: RSI, MACD, Bollinger Bands overlay
- **Interactive Charts**: Zoom, pan, and analyze historical data

### 🚨 Smart Alerts System
- **High-Confidence Alerts**: Automatic notifications for strong signals
- **Real-time Notifications**: Instant alerts via WebSocket
- **Alert History**: Complete log of all generated alerts
- **Customizable Filters**: Filter alerts by confidence level

### 💾 MongoDB Integration
- **Signal Storage**: All signals saved with complete metadata
- **Historical Analysis**: Track signal performance over time
- **User Preferences**: Personalized settings and configurations
- **Market Data Caching**: Efficient data storage and retrieval

### 🎨 Modern Web Interface
- **Dark Theme**: Professional trading interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data via WebSocket connections
- **Interactive Dashboard**: Comprehensive signal analytics

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-trading-signal-bot
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/trading-signals
PORT=5000
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
```

5. **Start MongoDB**
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

6. **Start the application**

**Development mode (recommended):**
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd client
npm start
```

**Production mode:**
```bash
# Build frontend
cd client
npm run build
cd ..

# Start production server
npm start
```

7. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📖 Usage Guide

### Dashboard Overview
- **Signal Statistics**: Real-time metrics and performance data
- **Active Alerts**: Recent high-confidence signals
- **Connection Status**: WebSocket connection indicator
- **Pair Selection**: Choose from 8+ cryptocurrency pairs

### Signal Analysis
- **Live Chart**: Real-time price data with signal markers
- **Signal Panel**: Latest signals with confidence levels
- **Historical Data**: Complete signal history with filtering
- **Technical Indicators**: RSI, MACD, EMA, Bollinger Bands

### Timeframe Filtering
- Select multiple timeframes simultaneously
- Filter signals by specific time periods
- Compare signals across different timeframes
- Customize display preferences

### Alert Management
- Automatic alerts for high-confidence signals
- Real-time notifications via WebSocket
- Alert history with search and filtering
- Customizable alert thresholds

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/trading-signals` |
| `PORT` | Server port | `5000` |
| `BINANCE_API_KEY` | Binance API key (optional) | - |
| `BINANCE_SECRET_KEY` | Binance secret key (optional) | - |
| `SIGNAL_INTERVAL` | Signal generation interval (ms) | `30000` |
| `MAX_SIGNALS_PER_PAIR` | Maximum signals to store per pair | `100` |

### Supported Trading Pairs
- BTC/USDT
- ETH/USDT
- ADA/USDT
- DOT/USDT
- LINK/USDT
- BNB/USDT
- XRP/USDT
- SOL/USDT

### Signal Confidence Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| **High** | ≥4 points | Strong signal with multiple confirmations |
| **Medium** | 2-3 points | Moderate signal with some confirmations |
| **Low** | 1 point | Weak signal with limited confirmations |

## 🧠 AI Algorithm Details

### Technical Indicators Used
1. **RSI (Relative Strength Index)**: Identifies overbought/oversold conditions
2. **MACD**: Detects trend changes and momentum
3. **EMA (Exponential Moving Average)**: Determines trend direction
4. **Bollinger Bands**: Identifies price volatility and potential reversals
5. **Volume Analysis**: Confirms signal strength

### Signal Generation Logic
- **Multi-factor Analysis**: Combines multiple indicators for accuracy
- **Trend Confirmation**: Validates signals with price action
- **Volume Validation**: Ensures sufficient market interest
- **Risk Management**: Includes stop-loss and target price calculations

## 📊 API Endpoints

### Signals
- `GET /api/signals` - Get all signals with filtering
- `GET /api/signals/pair/:pair` - Get signals for specific pair
- `GET /api/signals/latest` - Get latest signals
- `POST /api/signals/generate` - Generate signal manually
- `GET /api/signals/stats` - Get signal statistics

### Market Data
- `GET /api/signals/market-data/:pair/:timeframe` - Get market data
- `GET /api/pairs` - Get supported trading pairs
- `GET /api/timeframes` - Get available timeframes

### Alerts
- `GET /api/alerts` - Get recent alerts

### User Preferences
- `GET /api/signals/preferences/:userId` - Get user preferences
- `PUT /api/signals/preferences/:userId` - Update user preferences

## 🔌 WebSocket Events

### Client to Server
```javascript
{
  "type": "subscribe",
  "pair": "BTCUSDT",
  "timeframes": ["5m", "15m", "30m", "1h"]
}
```

### Server to Client
```javascript
// New Signal
{
  "type": "newSignal",
  "data": {
    "pair": "BTCUSDT",
    "signal": "BUY",
    "price": 45000,
    "confidence": "High",
    "timeframe": "15m",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}

// Alert
{
  "type": "alert",
  "data": {
    "message": "High confidence BUY signal for BTCUSDT at $45000",
    "confidence": "High",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## 🛠️ Development

### Project Structure
```
ai-trading-signal-bot/
├── server.js              # Main server file
├── package.json           # Backend dependencies
├── .env                   # Environment variables
├── models/                # MongoDB models
│   └── index.js
├── routes/                # API routes
│   └── signals.js
├── services/              # Business logic
│   └── signalGenerator.js
└── client/                # React frontend
    ├── package.json       # Frontend dependencies
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js         # Main React component
        ├── components/    # React components
        └── services/      # Frontend services
```

### Adding New Features
1. **New Indicators**: Add to `signalGenerator.js`
2. **New Pairs**: Update pairs list in API
3. **New Timeframes**: Add to timeframe configuration
4. **UI Components**: Create in `client/src/components/`

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **WebSocket Connection Failed**
   - Check if port 5000 is available
   - Verify firewall settings
   - Ensure backend server is running

3. **No Signals Generated**
   - Check Binance API connectivity
   - Verify market data is being fetched
   - Review signal generation logs

4. **Chart Not Loading**
   - Ensure TradingView script is loaded
   - Check browser console for errors
   - Verify market data availability

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm run dev
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## ⚠️ Disclaimer

This bot is for educational and research purposes only. Trading cryptocurrencies involves substantial risk of loss. Always do your own research and never invest more than you can afford to lose. The developers are not responsible for any financial losses incurred while using this software.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Happy Trading! 🚀📈**
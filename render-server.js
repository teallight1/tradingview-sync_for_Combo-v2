// ===========================
// Tradingview-sync_for_Combo-v2
// Deploy to NEW Render instance
// Your old server stays untouched
// ===========================

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
let syncState = {
  leaderId: null,
  leaderHeartbeat: 0,
  currentIndex: 0,
  rotateInterval: 7,
  fetchInterval: 120,
  colLInterval: 10,
  selectedFilters: ['Comfortable'],
  filteredData: [],
  alertSettings: {
    threshold_1c: 2,
    threshold_2c: 2,
    threshold_1_minus: 20,
    threshold_2_minus: 20,
    cooldown_1x: 15,
    cooldown_1c: 15,
    cooldown_1_plus: 15,
    cooldown_1_minus: 15,
    cooldown_2x: 15,
    cooldown_2c: 15,
    cooldown_2_plus: 15,
    cooldown_2_minus: 15
  }
};

// ===========================
// ENDPOINTS
// ===========================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    currentLeader: syncState.leaderId || 'none'
  });
});

// Get sync state
app.get('/sync-state', (req, res) => {
  res.json(syncState);
});

// Update sync state (leader heartbeat)
app.post('/sync-state', (req, res) => {
  syncState = { ...syncState, ...req.body };
  res.json({ success: true });
});

// Claim leadership
app.post('/claim-leader', (req, res) => {
  const { browserId, timestamp, force } = req.body;
  
  if (!browserId || !timestamp) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing browserId or timestamp' 
    });
  }
  
  // Force claim always succeeds (manual CLAIM button)
  if (force === true) {
    console.log(`🔥 FORCE CLAIM by ${browserId}`);
    syncState.leaderId = browserId;
    syncState.leaderHeartbeat = timestamp;
    return res.json({ 
      success: true, 
      leaderId: browserId,
      forced: true
    });
  }
  
  // Normal claim: check if no leader or leader timed out
  const timeSinceHeartbeat = Date.now() - syncState.leaderHeartbeat;
  
  if (!syncState.leaderId || timeSinceHeartbeat > 5000) {
    console.log(`👑 Leadership claimed by ${browserId}`);
    syncState.leaderId = browserId;
    syncState.leaderHeartbeat = timestamp;
    return res.json({ 
      success: true, 
      leaderId: browserId 
    });
  }
  
  // Leader exists and active
  console.log(`❌ Claim rejected. Leader ${syncState.leaderId} is active`);
  res.json({ 
    success: false, 
    leaderId: syncState.leaderId,
    reason: 'Leader active'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TradingView Sync Server v2',
    version: '2.0.0',
    endpoints: [
      'GET /health - Health check',
      'GET /sync-state - Get current state',
      'POST /sync-state - Update state (leader heartbeat)',
      'POST /claim-leader - Claim leadership'
    ],
    currentLeader: syncState.leaderId || 'none',
    lastHeartbeat: syncState.leaderHeartbeat ? new Date(syncState.leaderHeartbeat).toISOString() : 'never',
    browserCount: syncState.leaderId ? 1 : 0
  });
});

// ===========================
// START SERVER
// ===========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ TradingView Sync Server v2 running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync: http://localhost:${PORT}/sync-state`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Middleware - must be first
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, *');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Handle preflight
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Body parsing
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

// Proxy endpoint - SIMPLIFIED without timeout
app.post('/proxy', async (req, res) => {
  try {
    console.log('Received proxy request');
    
    if (!req.headers['x-api-key']) {
      return res.status(400).json({ error: 'Missing x-api-key header' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers['x-api-key'],
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('Successfully proxied to Anthropic');
    res.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

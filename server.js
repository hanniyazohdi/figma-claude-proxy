const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Increase payload limit for large documents
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware - must come before routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, *');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Figma Claude Proxy Server is running!',
    usage: 'Send POST requests to /proxy with x-api-key header'
  });
});

// Proxy endpoint
app.post('/proxy', async (req, res) => {
  try {
    console.log('Received request to proxy to Anthropic API');
    
    // Log request size for debugging
    const requestSize = JSON.stringify(req.body).length;
    console.log(`Request size: ${requestSize} characters`);
    
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
    
    console.log('Successfully proxied request to Anthropic API');
    
    // Ensure CORS headers are set in response
    res.header('Access-Control-Allow-Origin', '*');
    res.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Figma Claude proxy server running on port ${PORT}`);
});

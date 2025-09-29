const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Increase payload limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, *');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check with better info
app.get('/', (req, res) => {
  res.json({ 
    status: 'Figma Claude Proxy Server is running!',
    timestamp: new Date().toISOString(),
    usage: 'POST to /proxy with x-api-key header',
    note: 'Free Render.com instance may have cold starts'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', status: 'OK' });
});

// Proxy endpoint with better error handling
app.post('/proxy', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📨 Received proxy request');
    
    const requestSize = JSON.stringify(req.body).length;
    console.log(`📊 Request size: ${requestSize} characters`);
    
    // Add timeout to Anthropic API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers['x-api-key'],
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic API error:', response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    
    console.log(`✅ Request completed in ${endTime - startTime}ms`);
    
    res.header('Access-Control-Allow-Origin', '*');
    res.json(data);
    
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ Proxy error:', error.message);
    
    res.header('Access-Control-Allow-Origin', '*');
    
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Anthropic API timeout - request took too long' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

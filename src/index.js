/**
 * Climate Risk Tool API
 * Main Express server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { testConnection } from './config/database.js';

import municipalitiesRoutes from './routes/municipalities.js';
import climateDataRoutes from './routes/climate-data.js';
import indicesRoutes from './routes/indices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


dotenv.config({ path: resolve(__dirname, '../.env') });


const app = express();
const PORT = process.env.PORT || 4002;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());

// CORS - allow requests from any origin (adjust in production)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Climate Risk Tool API',
    version: '1.0.0',
    description: 'API for South African municipality climate risk data',
    endpoints: {
      health: '/health',
      municipalities: '/municipalities',
      climateData: '/climate-data',
      geojson: '/geojson/:scenario/:period/:index',
      indices: '/indices',
      docs: '/docs'
    },
    documentation: 'https://github.com/SAEON/climate-risk-tool-api'
  });
});


app.use('/municipalities', municipalitiesRoutes);
app.use('/climate-data', climateDataRoutes);
app.use('/indices', indicesRoutes);


app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /municipalities',
      'GET /climate-data',
      'GET /indices'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      const env = process.env.NODE_ENV || 'development';
      console.log(`Climate Risk Tool API - ${env} mode`);
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}


startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received - shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received - shutting down gracefully');
  process.exit(0);
});

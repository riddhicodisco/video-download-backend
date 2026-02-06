const cors = require('cors');

const getOrigin = () => {
  const origin = process.env.CORS_ORIGIN;
  if (!origin) return ['http://localhost:3000', 'http://localhost:3001'];
  if (origin === '*') return true; // Allow all
  if (origin.includes(',')) return origin.split(',').map(o => o.trim());
  return origin;
};

const corsOptions = {
  origin: getOrigin(),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);

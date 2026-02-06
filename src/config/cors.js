const cors = require('cors');

const corsOptions = {
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  credentials: true
};

module.exports = cors(corsOptions);

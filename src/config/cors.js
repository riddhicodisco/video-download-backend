const cors = require('cors');

const getOrigin = () => {
  const origin = process.env.CORS_ORIGIN;
  console.log('--- CORS CONFIG ---');
  console.log('CORS_ORIGIN env:', origin);

  if (!origin) {
    console.log('No CORS_ORIGIN set, using defaults: localhost');
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  if (origin === '*') {
    console.log('CORS set to wildcard (*)');
    return true;
  }

  const origins = origin.split(',').map(o => o.trim());
  console.log('Allowed Origins:', origins);
  return origins;
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = getOrigin();
    console.log('Incoming Request Origin:', origin);

    // If no origin (like mobile apps or curl), allow it
    if (!origin) return callback(null, true);

    if (allowed === true || (Array.isArray(allowed) && allowed.includes(origin)) || allowed === origin) {
      callback(null, true);
    } else {
      console.error('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);

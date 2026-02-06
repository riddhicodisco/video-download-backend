const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOriginEnv = process.env.CORS_ORIGIN;

    // Log for Render/Production debugging
    console.log(`[CORS DEBUG] Request from Origin: ${origin}`);
    console.log(`[CORS DEBUG] Allowed Origin Env: ${allowedOriginEnv}`);

    // If no origin (like mobile apps, postman, or same-origin), allow it
    if (!origin) {
      return callback(null, true);
    }

    // If CORS_ORIGIN is set to * or not set, allow all for debugging
    if (!allowedOriginEnv || allowedOriginEnv === '*') {
      console.log('[CORS DEBUG] Wildcard or no env set - allowing');
      return callback(null, true);
    }

    // Handle comma-separated list
    const allowedOrigins = allowedOriginEnv.split(',').map(o => o.trim());

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS DEBUG] Origin ${origin} is in allowed list.`);
      return callback(null, true);
    } else {
      console.error(`[CORS DEBUG] BLOCKED. Origin ${origin} not in [${allowedOrigins}]`);
      // For debugging, we can return an error or null
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);

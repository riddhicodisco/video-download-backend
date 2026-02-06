// Manual CORS middleware to ensure maximum compatibility and clear debugging
module.exports = (req, res, next) => {
  const origin = req.headers.origin;

  // Log origin for every request to help fix production issues
  console.log(`[CORS] Request Method: ${req.method}, Origin: ${origin || 'none'}`);

  if (origin) {
    // Reflect origin back to allow credentials
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Fallback for non-browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

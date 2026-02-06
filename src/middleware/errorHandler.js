const errorHandler = (err, req, res, next) => {
  console.error('[SERVER ERROR]:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Ensure CORS headers are present even on errors
  // This prevents the browser from showing a "CORS error" when the server actually has a 500 error.
  const origin = req.headers.origin;
  const allowedOriginEnv = process.env.CORS_ORIGIN;

  if (origin) {
    if (!allowedOriginEnv || allowedOriginEnv === '*' || allowedOriginEnv.split(',').map(o => o.trim()).includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    debug: {
      message: err.message,
      path: req.path,
      method: req.method
    }
  });
};

module.exports = errorHandler;

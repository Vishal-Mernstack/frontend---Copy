export function errorHandler(err, req, res, next) {
  console.error(err);
  
  // Ensure CORS headers are set for error responses
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    data: null,
  });
}

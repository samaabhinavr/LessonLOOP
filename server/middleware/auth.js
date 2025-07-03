
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  console.log('Auth middleware: Token received:', !!token);

  // Check if not token
  if (!token) {
    console.log('Auth middleware: No token found.');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware: Token decoded successfully. User ID:', decoded.user.id);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Auth middleware: Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};


module.exports = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied: You do not have the necessary permissions for this action.' });
    }
    next();
  };
};

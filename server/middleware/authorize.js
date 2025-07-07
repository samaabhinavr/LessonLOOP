
module.exports = (...roles) => {
  return async (req, res, next) => {
    // req.user.dbUser is now guaranteed to be available from the auth middleware
    const user = req.user.dbUser;

    if (!user) {
      console.log('Authorize middleware: dbUser not found on req.user. This should not happen if auth middleware ran correctly.');
      return res.status(404).json({ msg: 'User profile not found for authorization.' });
    }

    console.log('Authorize middleware: User role from DB:', user.role, 'Required roles:', roles);
    // Check if the user's role is included in the allowed roles
    if (!roles.includes(user.role)) {
      return res.status(403).json({ msg: 'Access denied: You do not have the necessary permissions for this action.' });
    }

    next();
  };
};

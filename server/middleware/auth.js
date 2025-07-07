
const admin = require('firebase-admin');
const User = require('../models/User'); // Import User model

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  console.log('Auth middleware: Token received:', token ? 'Yes' : 'No', token ? 'Token starts with: ' + token.substring(0, 10) + '...' : '');

  // Check if not token
  if (!token) {
    console.log('Auth middleware: No token found.');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Auth middleware: Firebase ID Token decoded successfully. UID:', decodedToken.uid);

    // Fetch user from MongoDB using firebaseUid
    let dbUser = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!dbUser) {
      console.log('Auth middleware: User not found in DB for Firebase UID:', decodedToken.uid, '. Creating a basic profile.');
      // Create a basic user profile if not found
      dbUser = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || 'New User', // Use Firebase name or a default
        role: 'Student', // Default role
        isVerified: decodedToken.email_verified,
      });
      await dbUser.save();
      console.log('Auth middleware: Basic user profile created for Firebase UID:', decodedToken.uid);
    }

    req.user = decodedToken; // Store the decoded Firebase token payload
    req.user.dbUser = dbUser; // Attach the full MongoDB user object
    next();
  } catch (err) {
    console.error('Auth middleware: Firebase ID Token verification failed:', err.message);
    res.status(401).json({ msg: 'Firebase ID Token is not valid or expired' });
  }
};

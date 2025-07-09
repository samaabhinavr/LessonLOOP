
console.log('Auth middleware file loaded.');
const admin = require('firebase-admin');
const User = require('../firestore/models/User'); // Import User model

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
    console.log('Auth middleware: Attempting to find user with firebaseUid:', decodedToken.uid);

    // Fetch user from Firestore using firebaseUid
    let dbUser = await User.findByFirebaseUid(decodedToken.uid);
    console.log('Auth middleware: Result of User.findByFirebaseUid (raw):', dbUser);
    console.log('Auth middleware: dbUser fetched from Firestore:', dbUser ? dbUser : 'Not found');

    if (!dbUser) {
      // If the user is not found in the database, it means their profile hasn't been created yet.
      // This is expected for new users who have just signed up with Firebase but haven't completed the profile registration step.
      // We will not create a user here. The 'register-profile' endpoint is responsible for that.
      // We can attach the firebase user info to the request and let the next middleware or route handler decide what to do.
      // However, for protected routes that expect a full user profile, this might cause issues.
      // For the '/profile' route, it will correctly return a 404 if the user is not found, which is what we want.
      console.log('Auth middleware: User not found in DB for Firebase UID:', decodedToken.uid);
      // Setting req.user but not req.user.dbUser
      console.log('Auth middleware: User not found in DB for Firebase UID:', decodedToken.uid);
      return res.status(404).json({ msg: 'User profile not found. Please complete your profile registration.' });
    }

    req.user = decodedToken; // Store the decoded Firebase token payload
    req.user.dbUser = dbUser; // Attach the full Firestore user object
    console.log('Auth middleware: req.dbUser attached:', req.dbUser);
    next();
  } catch (err) {
    console.error('Auth middleware: Firebase ID Token verification failed:', err.message);
    res.status(401).json({ msg: 'Firebase ID Token is not valid or expired' });
  }
};

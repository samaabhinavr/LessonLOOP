
const User = require('../models/User');

// @desc    Register user profile in MongoDB after Firebase registration
exports.registerProfile = async (req, res) => {
  const { uid, name, email, role, teacherCode } = req.body;

  try {
    // Check if user already exists in MongoDB (by Firebase UID)
    let user = await User.findOne({ firebaseUid: uid });
    if (user) {
      return res.status(400).json({ msg: 'User profile already exists for this Firebase UID' });
    }

    // Check teacher registration code if role is Teacher
    if (role === 'Teacher') {
      if (!teacherCode || teacherCode !== process.env.TEACHER_REGISTRATION_CODE) {
        return res.status(403).json({ msg: 'Invalid teacher registration code' });
      }
    }

    // Create new user profile in MongoDB
    user = new User({
      firebaseUid: uid,
      name,
      email,
      role,
      isVerified: true, // Firebase handles email verification
    });

    await user.save();

    res.status(201).json({ msg: 'User profile created successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get user profile by Firebase UID
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ msg: 'User profile not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Upload a profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ msg: 'Profile picture updated successfully', profilePicture: user.profilePicture });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Change user password (via Firebase, this endpoint might be removed or adapted)
exports.changePassword = async (req, res) => {
  // This endpoint is typically handled by Firebase directly on the frontend.
  // If you need to allow password changes via your backend, you would use Firebase Admin SDK:
  // admin.auth().updateUser(req.user.uid, { password: newPassword });
  // For now, this endpoint will return an error as it's not directly supported by Firebase Auth for backend.
  res.status(400).json({ msg: 'Password changes are handled by Firebase Authentication on the frontend.' });
};


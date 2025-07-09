
const User = require('../firestore/models/User');

// @desc    Register user profile in Firestore after Firebase registration
exports.registerProfile = async (req, res) => {
  const { uid, name, email, role, teacherCode } = req.body;
  console.log('authController: registerProfile - Request Body:', req.body);

  try {
    // Check if user already exists in Firestore (by Firebase UID)
    let user = await User.findByFirebaseUid(uid);
    if (user) {
      console.log('authController: registerProfile - User already exists:', user);
      return res.status(400).json({ msg: 'User profile already exists for this Firebase UID' });
    }

    // Check teacher registration code if role is Teacher
    if (role === 'Teacher') {
      if (!teacherCode || teacherCode !== process.env.TEACHER_REGISTRATION_CODE) {
        console.log('authController: registerProfile - Invalid teacher code.');
        return res.status(403).json({ msg: 'Invalid teacher registration code' });
      }
    }

    // Create new user profile in Firestore
    const newUser = {
      firebaseUid: uid,
      name,
      email,
      role,
      isVerified: true, // Firebase handles email verification
    };

    await User.create(newUser);
    console.log('authController: registerProfile - User saved to DB:', newUser);

    res.status(201).json({ msg: 'User profile created successfully', user: newUser });
  } catch (err) {
    console.error('authController: registerProfile - Server error:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get user profile by Firebase UID
exports.getUserProfile = async (req, res) => {
  try {
    const user = req.user.dbUser;
    console.log('authController: getUserProfile - User from req.user.dbUser:', user ? user : 'Not found');

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
    const user = await User.findByFirebaseUid(req.user.uid);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const updatedData = { profilePicture: `/uploads/${req.file.filename}` };
    await User.update(req.user.uid, updatedData);

    res.json({ msg: 'Profile picture updated successfully', profilePicture: updatedData.profilePicture });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


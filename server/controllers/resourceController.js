const Resource = require('../firestore/models/Resource');
const Class = require('../firestore/models/Class');
const { admin } = require('../config/firebase'); // Import admin from firebase config
const fs = require('fs').promises; // Import fs.promises for async file operations

// @desc    Upload a new resource
exports.uploadResource = async (req, res) => {
  try {
    const { title, classId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Check if user is authorized to upload to this class (teacher or student in class)
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    const isTeacher = classItem.teacher === req.user.dbUser.id;
    const isStudent = classItem.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to upload to this class' });
    }

    // --- Firebase Storage Upload Logic ---
    const bucket = admin.storage().bucket(); // Get default bucket
    const filePath = file.path; // Path to the temporary file in /tmp
    const destination = `resources/${file.filename}`; // Destination path in Firebase Storage

    // Upload the file to Firebase Storage
    await bucket.upload(filePath, {
      destination: destination,
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Get the public URL of the uploaded file
    const [url] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A far future date for permanent access
    });

    // Delete the temporary file from /tmp
    await fs.unlink(filePath);

    const newResource = {
      title,
      fileUrl: url, // Store the public URL from Firebase Storage
      fileType: file.mimetype,
      fileSize: file.size,
      class: classId,
      uploadedBy: req.user.dbUser.id,
      uploadDate: new Date(), // Add upload date
    };

    const savedResource = await Resource.create(newResource);
    res.json(savedResource);
  } catch (err) {
    console.error('Error uploading resource to Firebase Storage:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Get resources for a specific class
exports.getResourcesByClass = async (req, res) => {
  try {
    const classId = req.params.classId;

    // Check if user is authorized to view resources for this class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    const isTeacher = classItem.teacher === req.user.dbUser.id;
    const isStudent = classItem.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to view resources for this class' });
    }

    const resources = await Resource.getResourcesForClass(classId);
    res.json(resources);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
const Resource = require('../models/Resource');
const Class = require('../models/Class');

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

    const isTeacher = classItem.teacher.toString() === req.user.dbUser._id.toString();
    const isStudent = classItem.students.some(student => student._id.toString() === req.user.dbUser._id.toString());

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to upload to this class' });
    }

    const newResource = new Resource({
      title,
      fileUrl: `/uploads/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
      class: classId,
      uploadedBy: req.user.dbUser._id,
    });

    const savedResource = await newResource.save();
    res.json(savedResource);
  } catch (err) {
    console.error(err.message);
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

    const isTeacher = classItem.teacher.toString() === req.user.dbUser._id.toString();
    const isStudent = classItem.students.some(student => student._id.toString() === req.user.dbUser._id.toString());

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to view resources for this class' });
    }

    const resources = await Resource.find({ class: classId }).populate('uploadedBy', 'name email');
    res.json(resources);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
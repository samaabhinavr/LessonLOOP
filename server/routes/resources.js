
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const resourceController = require('../controllers/resourceController');

// @route   POST api/resources/upload/:classId
// @desc    Upload a file resource for a specific class
// @access  Private (Teacher)
router.post('/upload/:classId', auth, (req, res, next) => {
  req.upload.single('file')(req, res, function (err) {
    if (err instanceof Error) {
      return res.status(500).json({ msg: err.message });
    }
    next();
  });
}, resourceController.uploadResource);

// @route   GET api/resources/:classId
// @desc    Get all resources for a specific class
// @access  Private
router.get('/:classId', auth, resourceController.getResourcesByClass);

module.exports = router;

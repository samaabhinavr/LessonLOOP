const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

const authorize = require('../middleware/authorize');

router.get('/:classId', auth, authorize('Teacher', 'Student'), getAnalytics);

module.exports = router;
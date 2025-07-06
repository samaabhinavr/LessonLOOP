const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/:classId', auth, getAnalytics);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getActivePoll } = require('../controllers/pollController');
const auth = require('../middleware/auth');

router.get('/active/:classId', auth, getActivePoll);

module.exports = router;
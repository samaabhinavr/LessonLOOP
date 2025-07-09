const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../firestore/models/Notification');

// @route    GET /api/notifications
// @desc     Get all notifications for the authenticated user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.getNotificationsForUser(req.user.dbUser.id);
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT /api/notifications/mark-read/:id
// @desc     Mark a notification as read
// @access   Private
router.put('/mark-read/:id', auth, async (req, res) => {
  try {
    let notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Ensure user owns the notification
    if (notification.recipient !== req.user.dbUser.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Notification.markAsRead(req.params.id);

    res.json({ ...notification, read: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT /api/notifications/mark-all-read
// @desc     Mark all notifications as read for the authenticated user
// @access   Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.markAllAsReadForUser(req.user.dbUser.id);
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE /api/notifications/:id
// @desc     Delete a specific notification
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Ensure user owns the notification
    if (notification.recipient !== req.user.dbUser.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Notification.delete(req.params.id);
    res.json({ msg: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE /api/notifications/read
// @desc     Delete all read notifications for the authenticated user
// @access   Private
router.delete('/read', auth, async (req, res) => {
  try {
    await Notification.deleteAllReadForUser(req.user.dbUser.id);
    res.json({ msg: 'All read notifications removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
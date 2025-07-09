const { db } = require('../../config/firebase');

const notificationsCollection = db.collection('notifications');

const Notification = {
  async create(notificationData) {
    const newNotificationRef = notificationsCollection.doc();
    await newNotificationRef.set({ ...notificationData, id: newNotificationRef.id, read: false, createdAt: new Date() });
    return newNotificationRef;
  },

  async createMany(notifications) {
    const batch = db.batch();
    notifications.forEach(notification => {
      const newNotificationRef = notificationsCollection.doc();
      batch.set(newNotificationRef, { ...notification, id: newNotificationRef.id, read: false, createdAt: new Date() });
    });
    await batch.commit();
  },

  async findById(id) {
    const notificationRef = notificationsCollection.doc(id);
    const doc = await notificationRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getNotificationsForUser(userId) {
    const snapshot = await notificationsCollection.where('recipient', '==', userId).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async markAsRead(id) {
    const notificationRef = notificationsCollection.doc(id);
    await notificationRef.update({ read: true });
    return notificationRef;
  },

  async markAllAsReadForUser(userId) {
    const snapshot = await notificationsCollection.where('recipient', '==', userId).where('read', '==', false).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  },

  async delete(id) {
    const notificationRef = notificationsCollection.doc(id);
    await notificationRef.delete();
  },

  async deleteAllReadForUser(userId) {
    const snapshot = await notificationsCollection.where('recipient', '==', userId).where('read', '==', true).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
};

module.exports = Notification;
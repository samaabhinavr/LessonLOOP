
const { db } = require('../../config/firebase');

const usersCollection = db.collection('users');

const User = {
  async create(userData) {
    const userRef = usersCollection.doc(userData.firebaseUid);
    await userRef.set(userData);
    return userRef;
  },

  async findByFirebaseUid(uid) {
    const userRef = usersCollection.doc(uid);
    const doc = await userRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async update(uid, updatedData) {
    const userRef = usersCollection.doc(uid);
    await userRef.update(updatedData);
    return userRef;
  }
};

module.exports = User;

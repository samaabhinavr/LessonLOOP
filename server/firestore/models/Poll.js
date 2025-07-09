const { db } = require('../../config/firebase');

const pollsCollection = db.collection('polls');

const Poll = {
  async create(pollData) {
    const newPollRef = pollsCollection.doc();
    await newPollRef.set({ ...pollData, id: newPollRef.id });
    const doc = await newPollRef.get();
    return { id: doc.id, ...doc.data() };
  },

  async findById(id) {
    const pollRef = pollsCollection.doc(id);
    const doc = await pollRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getPollsForClass(classId) {
    const snapshot = await pollsCollection.where('class', '==', classId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getActivePollForClass(classId) {
    const snapshot = await pollsCollection.where('class', '==', classId).where('isActive', '==', true).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async update(id, updatedData) {
    const pollRef = pollsCollection.doc(id);
    await pollRef.update(updatedData);
    const doc = await pollRef.get();
    return { id: doc.id, ...doc.data() };
  },

  async delete(id) {
    const pollRef = pollsCollection.doc(id);
    await pollRef.delete();
  }
};

module.exports = Poll;
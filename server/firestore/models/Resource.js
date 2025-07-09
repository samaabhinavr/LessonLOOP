
const { db } = require('../../config/firebase');

const resourcesCollection = db.collection('resources');

const Resource = {
  async create(resourceData) {
    const newResourceRef = resourcesCollection.doc();
    await newResourceRef.set({ ...resourceData, id: newResourceRef.id, uploadDate: new Date() });
    return newResourceRef;
  },

  async findById(id) {
    const resourceRef = resourcesCollection.doc(id);
    const doc = await resourceRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getResourcesForClass(classId) {
    const snapshot = await resourcesCollection.where('class', '==', classId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async delete(id) {
    const resourceRef = resourcesCollection.doc(id);
    await resourceRef.delete();
  }
};

module.exports = Resource;


const { db } = require('../../config/firebase');

const quizzesCollection = db.collection('quizzes');

const Quiz = {
  async create(quizData) {
    const newQuizRef = quizzesCollection.doc();
    await newQuizRef.set({ ...quizData, id: newQuizRef.id });
    return { id: newQuizRef.id, ...quizData };
  },

  async findById(id) {
    const quizRef = quizzesCollection.doc(id);
    const doc = await quizRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getQuizzesForClass(classId) {
    const snapshot = await quizzesCollection.where('class', '==', classId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async update(id, updatedData) {
    const quizRef = quizzesCollection.doc(id);
    await quizRef.update(updatedData);
    const doc = await quizRef.get();
    return { id: doc.id, ...doc.data() };
  },

  async delete(id) {
    const quizRef = quizzesCollection.doc(id);
    await quizRef.delete();
  }
};

module.exports = Quiz;

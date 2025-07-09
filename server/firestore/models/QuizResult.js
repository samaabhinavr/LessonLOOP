
const { db } = require('../../config/firebase');

const quizResultsCollection = db.collection('quizResults');

const QuizResult = {
  async create(resultData) {
    const newResultRef = quizResultsCollection.doc();
    await newResultRef.set({ ...resultData, id: newResultRef.id });
    const doc = await newResultRef.get();
    return { id: doc.id, ...doc.data() };
  },

  async findById(id) {
    const resultRef = quizResultsCollection.doc(id);
    const doc = await resultRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async findResult(quizId, studentId) {
    const snapshot = await quizResultsCollection
      .where('quiz', '==', quizId)
      .where('student', '==', studentId)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async getResultsForQuiz(quizId) {
    const snapshot = await quizResultsCollection.where('quiz', '==', quizId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getResultsForQuizzes(quizIds) {
    if (!quizIds || quizIds.length === 0) {
      return [];
    }
    const results = [];
    const chunkSize = 10;
    for (let i = 0; i < quizIds.length; i += chunkSize) {
      const chunk = quizIds.slice(i, i + chunkSize);
      const snapshot = await quizResultsCollection.where('quiz', 'in', chunk).get();
      snapshot.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    }
    return results;
  },

  async getResultsForStudent(studentId) {
    const snapshot = await quizResultsCollection.where('student', '==', studentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getResultsForStudentInQuizzes(studentId, quizIds) {
    if (!quizIds || quizIds.length === 0) {
      return [];
    }
    // Firestore 'in' query has a limit of 10. If more, split into multiple queries.
    const results = [];
    const chunkSize = 10;
    for (let i = 0; i < quizIds.length; i += chunkSize) {
      const chunk = quizIds.slice(i, i + chunkSize);
      const snapshot = await quizResultsCollection
        .where('student', '==', studentId)
        .where('quiz', 'in', chunk)
        .get();
      snapshot.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    }
    return results;
  }
};

module.exports = QuizResult;


const { db } = require('../../config/firebase');
const { nanoid } = require('nanoid');
const User = require('./User'); // Import the User model

const classesCollection = db.collection('classes');

const Class = {
  async create(classData) {
    const inviteCode = nanoid(8);
    const newClassRef = classesCollection.doc();
    await newClassRef.set({ ...classData, inviteCode, id: newClassRef.id });
    const newClassDoc = await newClassRef.get();
    return { id: newClassDoc.id, ...newClassDoc.data() };
  },

  async findById(id) {
    const classRef = classesCollection.doc(id);
    const doc = await classRef.get();
    const classData = doc.exists ? { id: doc.id, ...doc.data() } : null;

    if (classData && classData.teacher) {
      const teacher = await User.findByFirebaseUid(classData.teacher);
      if (teacher) {
        classData.teacherName = teacher.name;
      }
    }
    return classData;
  },

  async findByInviteCode(inviteCode) {
    const snapshot = await classesCollection.where('inviteCode', '==', inviteCode).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    const classData = { id: doc.id, ...doc.data() };

    if (classData.teacher) {
      const teacher = await User.findByFirebaseUid(classData.teacher);
      if (teacher) {
        classData.teacherName = teacher.name;
      }
    }
    return classData;
  },

  async update(id, updatedData) {
    const classRef = classesCollection.doc(id);
    await classRef.update(updatedData);
    const doc = await classRef.get();
    return { id: doc.id, ...doc.data() };
  },

  async getClassesForTeacher(teacherId) {
    const snapshot = await classesCollection.where('teacher', '==', teacherId).get();
    const classes = await Promise.all(snapshot.docs.map(async doc => {
      const classData = { id: doc.id, ...doc.data() };
      if (classData.teacher) {
        const teacher = await User.findByFirebaseUid(classData.teacher);
        if (teacher) {
          classData.teacherName = teacher.name;
        }
      }
      return classData;
    }));
    return classes;
  },

  async getClassesForStudent(studentId) {
    const snapshot = await classesCollection.where('students', 'array-contains', studentId).get();
    const classes = await Promise.all(snapshot.docs.map(async doc => {
      const classData = { id: doc.id, ...doc.data() };
      if (classData.teacher) {
        const teacher = await User.findByFirebaseUid(classData.teacher);
        if (teacher) {
          classData.teacherName = teacher.name;
        }
      }
      return classData;
    }));
    return classes;
  }
};

module.exports = Class;

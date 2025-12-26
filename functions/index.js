const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.updateTeacherLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { currentBoardId, nextBoardId, teacherName } = data;
  if (!currentBoardId || !nextBoardId || !teacherName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
  }

  const db = admin.firestore();
  const nextBoardRef = db.collection('smartboards').doc(nextBoardId);

  try {
    await nextBoardRef.update({
      teacherIncoming: {
        name: teacherName,
        from: currentBoardId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating teacher location: ", error);
    throw new functions.https.HttpsError('internal', 'Failed to update teacher location.');
  }
});

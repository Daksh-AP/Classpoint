import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { EventContext } from 'firebase-functions';

interface SharedFileData {
    storagePath?: string;
    [key: string]: unknown
}

interface LocationData {
    currentBoardId: string;
    nextBoardId: string;
    teacherName: string;
}

export const cleanupSharedFile = functions.firestore.document('shared_files/{fileId}').onDelete(async (snap: QueryDocumentSnapshot, context: EventContext) => {
    const data = snap.data() as SharedFileData;
    if (data.storagePath) {
        try {
            await admin.storage().bucket().file(data.storagePath).delete();
// /* console.log */ (`Successfully cleaned up file: ${data.storagePath}`);
        } catch (error) {
// /* console.error */ (`Failed to delete storage file ${data.storagePath}`, error);
        }
    }
});

export const updateTeacherLocation = functions.https.onCall(async (data: LocationData, context: functions.https.CallableContext) => {
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
// /* console.error */ ("Error updating teacher location: ", error);
        throw new functions.https.HttpsError('internal', 'Failed to update teacher location.');
    }
});

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Change, EventContext } from 'firebase-functions';
import { DocumentSnapshot } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Automatically maintains aggregate student counts at schools/{schoolId}/stats/summary
 */
export const onStudentWrite = functions.firestore
    .document('schools/{schoolId}/grades/{gradeId}/sections/{sectionId}/students/{studentId}')
    .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
        const { schoolId } = context.params;
        if (!schoolId) return;

        const summaryRef = db.doc(`schools/${schoolId}/stats/summary`);

        // Case 1: Created
        if (!change.before.exists && change.after.exists) {
            const data = change.after.data() || {};
            if (!data.isDeleted) {
                await summaryRef.set({
                    students: admin.firestore.FieldValue.increment(1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            return;
        }

        // Case 2: Deleted
        if (change.before.exists && !change.after.exists) {
            const data = change.before.data() || {};
            if (!data.isDeleted) {
                await summaryRef.set({
                    students: admin.firestore.FieldValue.increment(-1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            return;
        }

        // Case 3: Soft-delete toggle
        if (change.before.exists && change.after.exists) {
            const beforeData = change.before.data() || {};
            const afterData = change.after.data() || {};

            if (!beforeData.isDeleted && afterData.isDeleted) {
                // Marked deleted
                await summaryRef.set({
                    students: admin.firestore.FieldValue.increment(-1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else if (beforeData.isDeleted && !afterData.isDeleted) {
                // Restored
                await summaryRef.set({
                    students: admin.firestore.FieldValue.increment(1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
    });

/**
 * Automatically maintains aggregate section counts at schools/{schoolId}/stats/summary
 */
export const onSectionWrite = functions.firestore
    .document('schools/{schoolId}/grades/{gradeId}/sections/{sectionId}')
    .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
        const { schoolId } = context.params;
        if (!schoolId) return;

        const summaryRef = db.doc(`schools/${schoolId}/stats/summary`);

        if (!change.before.exists && change.after.exists) {
            const data = change.after.data() || {};
            if (!data.isDeleted) {
                await summaryRef.set({
                    sections: admin.firestore.FieldValue.increment(1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } else if (change.before.exists && !change.after.exists) {
            const data = change.before.data() || {};
            if (!data.isDeleted) {
                await summaryRef.set({
                    sections: admin.firestore.FieldValue.increment(-1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
    });

/**
 * Callable function to compute and backfill schools/{schoolId}/stats/summary in 1 server job
 */
export const recalculateSchoolStats = functions.https.onCall(async (data: { schoolId: string }, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const schoolId = data?.schoolId;
    if (!schoolId) {
        throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
    }

    // 1. Calculate active sections
    const gradesSnap = await db.collection(`schools/${schoolId}/grades`).get();
    let totalSections = 0;
    for (const gradeDoc of gradesSnap.docs) {
        const secSnap = await db.collection(`schools/${schoolId}/grades/${gradeDoc.id}/sections`).get();
        totalSections += secSnap.docs.filter(d => !d.data()?.isDeleted).length;
    }

    // 2. Count students across school (active only)
    const studentsSnap = await db.collectionGroup('students')
        .where('schoolId', '==', schoolId)
        .get();
    const activeStudents = studentsSnap.docs.filter(d => !d.data()?.isDeleted).length;

    // 3. Count staff & parents
    const usersSnap = await db.collection(`schools/${schoolId}/users`).get();
    let staffCount = 0;
    let parentsCount = 0;
    usersSnap.forEach(d => {
        const role = d.data()?.role;
        if (role === 'parent') parentsCount++;
        else if (role === 'teacher' || role === 'admin' || role === 'coordinator' || role === 'staff') staffCount++;
    });

    const summaryData = {
        students: activeStudents,
        sections: totalSections,
        staff: staffCount,
        parents: parentsCount,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.doc(`schools/${schoolId}/stats/summary`).set(summaryData, { merge: true });

    return summaryData;
});

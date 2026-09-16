import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * 1. Clean Ghost Sections & Empty Rosters (Server-Side)
 */
export const cleanGhostSections = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const schoolId = data.schoolId;
  if (!schoolId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }

  const gradesSnap = await db.collection(`schools/${schoolId}/grades`).get();
  let ghostsRemoved = 0;
  let emptiesRemoved = 0;

  for (const gradeDoc of gradesSnap.docs) {
    const gradeData = gradeDoc.data();
    if (!gradeData.sections) continue;

    const updates: Record<string, any> = {};
    let needsUpdate = false;

    for (const [type, nums] of Object.entries(gradeData.sections) as [string, any[]][]) {
      const valid: string[] = [];
      for (const n of nums) {
        const sid = `${gradeDoc.id}-${type.toLowerCase()}${n}`;
        const sectionRef = db.doc(`schools/${schoolId}/grades/${gradeDoc.id}/sections/${sid}`);
        const ssnap = await sectionRef.get();

        if (ssnap.exists) {
          const studentsSnap = await sectionRef.collection('students').limit(1).get();
          if (studentsSnap.empty) {
            emptiesRemoved++;
            needsUpdate = true;
          } else {
            valid.push(n);
          }
        } else {
          ghostsRemoved++;
          needsUpdate = true;
        }
      }

      if (valid.length === 0) {
        updates[`sections.${type}`] = admin.firestore.FieldValue.delete();
      } else if (valid.length !== nums.length) {
        updates[`sections.${type}`] = valid;
      }
    }

    if (needsUpdate) {
      await gradeDoc.ref.update(updates);
    }
  }

  return { ghostsRemoved, emptiesRemoved };
});

/**
 * 2. Purge / Clear Students Safely
 */
export const purgeSchoolStudents = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const schoolId = data.schoolId;
  if (!schoolId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }

  const snapshot = await db.collectionGroup('students')
    .where('schoolId', '==', schoolId)
    .get();

  const batchSize = 400;
  const batches = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    currentBatch.update(doc.ref, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: context.auth.uid || 'Admin'
    });
    count++;

    if (count % batchSize === 0) {
      batches.push(currentBatch.commit());
      currentBatch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    batches.push(currentBatch.commit());
  }

  await Promise.all(batches);
  return { deletedCount: count };
});

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Change, EventContext } from 'firebase-functions';
import { DocumentSnapshot } from 'firebase-admin/firestore';

interface AttendanceRecords {
    [studentId: string]: string; // "present" | "absent" | "late"
}

interface AttendanceData {
    records?: AttendanceRecords;
    presentCount?: number;
    absentCount?: number;
}

export const syncAbsenceImpactOnAttendanceChange = functions.firestore
    .document('schoolData/grades/gradesList/{gradeId}/sections/{sectionId}/attendance/{dateKey}')
    .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
        const { gradeId, sectionId, dateKey } = context.params;
        const db = admin.firestore();

// /* console.log */ (`[Cloud Function] Syncing Absence Impact for ${gradeId} > ${sectionId} on ${dateKey}`);

        let absentStudents: string[] = [];
        if (change.after.exists) {
            const data = change.after.data() as AttendanceData;
            const records = data.records || {};
            absentStudents = Object.keys(records).filter(id => records[id] === 'absent');
        }

        const startOfDay = new Date(`${dateKey}T00:00:00Z`);
        const endOfDay = new Date(`${dateKey}T23:59:59Z`);

        const entriesSnapshot = await db.collection('schoolData/classContexts/lessonEntries')
            .where('gradeId', '==', gradeId)
            .where('sectionId', '==', sectionId)
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<=', endOfDay)
            .get();

        if (entriesSnapshot.empty) {
// /* console.log */ ('No lesson entries found for this date. Exiting.');
            return null;
        }

        const studentsMap: { [id: string]: string } = {};
        if (absentStudents.length > 0) {
            const studentRefs = absentStudents.map(id => 
                db.doc(`schoolData/grades/gradesList/${gradeId}/sections/${sectionId}/students/${id}`)
            );
            
            const studentDocs = await db.getAll(...studentRefs);
            studentDocs.forEach(docSnap => {
                if (docSnap.exists) {
                    studentsMap[docSnap.id] = docSnap.data()?.name || 'Unknown';
                }
            });
        }

        const batch = db.batch();

        entriesSnapshot.forEach(docSnap => {
            const entry = docSnap.data();
            
            const absenceImpact = absentStudents.map(id => ({
                studentId: id,
                studentName: studentsMap[id] || "Unknown Student",
                missedTopic: entry.currentTopic || "Unknown Topic",
                severity: "medium"
            }));

            batch.update(docSnap.ref, {
                absentStudentsAtTime: absentStudents,
                absenceImpact: absenceImpact
            });

            const contextId = `${gradeId}_${sectionId}_${(entry.subject || '').replace(/\s+/g, '_')}`;
            const contextRef = db.collection('schoolData/classContexts/subjectStates').doc(contextId);
            batch.set(contextRef, { absenceImpact }, { merge: true });
        });

        try {
            await batch.commit();
// /* console.log */ (`Successfully synced absence impact for ${entriesSnapshot.size} lessons.`);
        } catch (error) {
// /* console.error */ (`Failed to sync absence impact for ${gradeId} > ${sectionId}:`, error);
            throw error;
        }
        return null;
    });

export const aggregateDailyStats = functions.firestore
    .document('schoolData/grades/gradesList/{gradeId}/sections/{sectionId}/attendance/{dateKey}')
    .onWrite(async (change: Change<DocumentSnapshot>, context: EventContext) => {
        const { dateKey } = context.params;
        const db = admin.firestore();

        const beforeData = (change.before.exists ? change.before.data() : { presentCount: 0, absentCount: 0 }) as AttendanceData;
        const afterData = (change.after.exists ? change.after.data() : { presentCount: 0, absentCount: 0 }) as AttendanceData;

        const deltaPresent = (afterData.presentCount || 0) - (beforeData.presentCount || 0);
        const deltaAbsent = (afterData.absentCount || 0) - (beforeData.absentCount || 0);

        if (deltaPresent === 0 && deltaAbsent === 0) {
// /* console.log */ ("No change in attendance counts. Skipping aggregation.");
            return null;
        }

// /* console.log */ (`[Cloud Function] Aggregating stats for ${dateKey}: Present Delta = ${deltaPresent}, Absent Delta = ${deltaAbsent}`);

        const statsRef = db.collection('schoolStats').doc(`daily_${dateKey}`);

        await statsRef.set({
            totalPresent: admin.firestore.FieldValue.increment(deltaPresent),
            totalAbsent: admin.firestore.FieldValue.increment(deltaAbsent),
            date: dateKey,
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

// /* console.log */ (`Successfully updated daily stats for ${dateKey}`);
        return null;
    });

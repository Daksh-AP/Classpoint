import { doc, getDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getSchoolId } from '../lib/firebase/paths';
import { matchesSectionAndGrade } from '../utils/sectionUtils';

export interface OpenLoop {
  id: string;
  type: 'confusion' | 'question';
  note: string;
  studentTags: string[];
}

export interface ClassContext {
  id: string;
  gradeId: string;
  sectionId: string;
  subject: string;
  currentTopic: string;
  nextTopic: string;
  completionStatus: string;
  lastSummary: string;
  lastUpdatedBy: string;
  lastUpdatedByName: string;
  openLoops?: OpenLoop[];
  absenceImpact?: any[];
}

export const ClassContextService = {
  subscribeToContext: (
    gradeId: string,
    sectionId: string,
    subject: string,
    callback: (context: ClassContext | null) => void,
    schoolId?: string
  ) => {
    if (!gradeId || !sectionId || !subject) {
      callback(null);
      return () => {};
    }

    const activeSchoolId = schoolId || getSchoolId();
    const sectionObj = {
      grade: gradeId,
      id: sectionId,
    };
    const targetSubject = subject.trim().toLowerCase();

    const statesRef = collection(db, 'schools', activeSchoolId, 'subjectStates');

    return onSnapshot(statesRef, (snapshot) => {
      const match = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any))
        .find((ctx) => {
          if (!ctx.subject) return false;
          const s = String(ctx.subject).trim().toLowerCase();
          if (s !== targetSubject && !s.startsWith(`${targetSubject} -`) && !s.startsWith(`${targetSubject}-`)) return false;
          return matchesSectionAndGrade(ctx, sectionObj);
        });

      if (match) {
        callback(match as ClassContext);
      } else {
        callback(null);
      }
    }, () => {
      callback(null);
    });
  },

  resolveOpenLoop: async (gradeId: string, sectionId: string, subject: string, loopId: string, schoolId?: string) => {
    try {
      const activeSchoolId = schoolId || getSchoolId();
      const sectionObj = { grade: gradeId, id: sectionId };
      const targetSubject = subject.trim().toLowerCase();

      // Check collection for matching doc
      const statesRef = collection(db, 'schools', activeSchoolId, 'subjectStates');
      const allStates = await getDocs(statesRef);
      const match = allStates.docs.find((d) => {
        const data = d.data();
        if (!data.subject) return false;
        const s = String(data.subject).trim().toLowerCase();
        if (s !== targetSubject && !s.startsWith(`${targetSubject} -`) && !s.startsWith(`${targetSubject}-`)) return false;
        return matchesSectionAndGrade({ id: d.id, ...data }, sectionObj);
      });

      if (match) {
        const targetRef = doc(db, 'schools', activeSchoolId, 'subjectStates', match.id);
        const currentLoops = match.data().openLoops || [];
        const updatedLoops = currentLoops.filter((loop: any) => loop.id !== loopId);
        
        await updateDoc(targetRef, {
          openLoops: updatedLoops
        });
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }
};

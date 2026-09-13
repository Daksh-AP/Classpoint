import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const useUserSettings = (uid?: string, schoolId?: string) => {
  return useQuery({
    queryKey: ['userSettings', uid, schoolId],
    queryFn: async () => {
      if (!uid) return null;

      // 1. Try school-scoped user_settings
      if (schoolId && schoolId !== 'default_school') {
        try {
          const ref = doc(db, 'schools', schoolId, 'user_settings', uid);
          const snap = await getDoc(ref);
          if (snap.exists()) return snap.data();
        } catch {
          // ignore permissions
        }
      }

      // 2. Try root user_settings
      try {
        const rootRef = doc(db, 'user_settings', uid);
        const rootSnap = await getDoc(rootRef);
        if (rootSnap.exists()) return rootSnap.data();
      } catch {
        // ignore
      }

      // 3. Fallback to localStorage
      try {
        const local = localStorage.getItem(`userSettings_${uid}`);
        if (local) return JSON.parse(local);
      } catch {
        // ignore
      }

      return null;
    },
    enabled: !!uid,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useUpdateUserSettings = (uid?: string, schoolId?: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!uid) throw new Error("No user ID provided");

      try {
        localStorage.setItem(`userSettings_${uid}`, JSON.stringify(data));
      } catch {
        // ignore
      }

      // 1. Write to root user_settings
      try {
        const rootRef = doc(db, 'user_settings', uid);
        await setDoc(rootRef, data, { merge: true });
      } catch {
        // ignore
      }

      // 2. Try school-scoped user_settings
      if (schoolId && schoolId !== 'default_school') {
        try {
          const ref = doc(db, 'schools', schoolId, 'user_settings', uid);
          await setDoc(ref, data, { merge: true });
        } catch {
          // ignore
        }
      }

      return data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['userSettings', uid, schoolId] });
      const previous = queryClient.getQueryData(['userSettings', uid, schoolId]);
      queryClient.setQueryData(['userSettings', uid, schoolId], (old: any) => ({ ...old, ...newData }));
      return { previous };
    },
    onError: (err, newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['userSettings', uid, schoolId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', uid, schoolId] });
    }
  });
};

export function getBoardDocId(sectionId?: string): string | null {
  if (!sectionId) return null;
  const match = sectionId.match(/^grade(\d+)-(.*)$/i);
  if (!match || !match[1] || !match[2]) return null;
  const grade = match[1];
  const sec = match[2].replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `board_g${grade}_${sec}`;
}

export const useTimetable = (uid?: string, schoolId?: string, selectedSectionId?: string) => {
  const boardDocId = getBoardDocId(selectedSectionId);

  return useQuery({
    queryKey: ['timetable', uid, schoolId, selectedSectionId, boardDocId],
    queryFn: async () => {
      // 1. Try smartboard document for the selected section (e.g. board_g9_whiz1)
      if (boardDocId) {
        try {
          const boardRef = doc(db, 'timetables', boardDocId);
          const boardSnap = await getDoc(boardRef);
          if (boardSnap.exists()) {
            const data = boardSnap.data();
            if (data?.sections && Object.keys(data.sections).length > 0) {
              return data;
            }
          }
        } catch (e) {
          // ignore permission errors
        }
      }

      // 2. Try school-scoped timetables
      if (schoolId) {
        if (boardDocId) {
          try {
            const schoolBoardRef = doc(db, 'schools', schoolId, 'timetables', boardDocId);
            const snap = await getDoc(schoolBoardRef);
            if (snap.exists()) return snap.data();
          } catch {}
        }
        if (selectedSectionId) {
          try {
            const secRef = doc(db, 'schools', schoolId, 'timetables', selectedSectionId);
            const snap = await getDoc(secRef);
            if (snap.exists()) return snap.data();
          } catch {}
        }
        if (uid) {
          try {
            const schoolRef = doc(db, 'schools', schoolId, 'timetables', uid);
            const snap = await getDoc(schoolRef);
            if (snap.exists()) return snap.data();
          } catch {}
        }
      }

      // 3. Try root timetables collection for user
      if (uid) {
        try {
          const rootRef = doc(db, 'timetables', uid);
          const rootSnap = await getDoc(rootRef);
          if (rootSnap.exists()) return rootSnap.data();
        } catch {}
      }

      // 4. Fallback to localStorage
      try {
        const local = (boardDocId && localStorage.getItem(`timetableData_${boardDocId}`)) ||
                      (uid && localStorage.getItem(`timetableData_${uid}`)) ||
                      localStorage.getItem('timetableData');
        if (local) return JSON.parse(local);
      } catch {}

      return null;
    },
    enabled: !!uid || !!selectedSectionId || !!boardDocId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpdateTimetable = (uid?: string, schoolId?: string, selectedSectionId?: string) => {
  const queryClient = useQueryClient();
  const boardDocId = getBoardDocId(selectedSectionId);
  
  return useMutation({
    mutationFn: async (data: any) => {
      // Determine boardDocId from data if not already present
      let effectiveBoardDocId = boardDocId;
      if (!effectiveBoardDocId && data?.sections) {
        const firstSecKey = Object.keys(data.sections)[0];
        effectiveBoardDocId = getBoardDocId(firstSecKey);
      }

      // Save locally immediately
      try {
        if (effectiveBoardDocId) localStorage.setItem(`timetableData_${effectiveBoardDocId}`, JSON.stringify(data));
        if (uid) localStorage.setItem(`timetableData_${uid}`, JSON.stringify(data));
        localStorage.setItem('timetableData', JSON.stringify(data));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }

      let savedToCloud = false;

      // 1. Write to board doc (timetables/board_g9_whiz1) so smartboards and mobile apps update immediately!
      if (effectiveBoardDocId) {
        try {
          const boardRef = doc(db, 'timetables', effectiveBoardDocId);
          await setDoc(boardRef, data, { merge: true });
          savedToCloud = true;
        } catch (e) {
          console.warn('Board timetable save error:', e);
        }
      }

      // 2. Write to root timetables/{uid} (verified permissions)
      if (uid) {
        try {
          const rootRef = doc(db, 'timetables', uid);
          await setDoc(rootRef, data, { merge: true });
          savedToCloud = true;
        } catch (e) {
          console.warn('Root timetables save warning:', e);
        }
      }

      // 3. Write to school-scoped timetables if available
      if (schoolId) {
        if (effectiveBoardDocId) {
          try {
            await setDoc(doc(db, 'schools', schoolId, 'timetables', effectiveBoardDocId), data, { merge: true });
            savedToCloud = true;
          } catch (e) {
            console.warn('School board timetables save warning:', e);
          }
        }
        if (selectedSectionId) {
          try {
            await setDoc(doc(db, 'schools', schoolId, 'timetables', selectedSectionId), data, { merge: true });
            savedToCloud = true;
          } catch {}
        }
        if (uid) {
          try {
            const schoolRef = doc(db, 'schools', schoolId, 'timetables', uid);
            await setDoc(schoolRef, data, { merge: true });
            savedToCloud = true;
          } catch (e) {
            console.warn('School timetables save warning:', e);
          }
        }
      }

      if (!savedToCloud) {
        console.warn('Cloud timetable save encountered issues, data preserved in local cache.');
      }

      return data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['timetable'] });
      const previous = queryClient.getQueryData(['timetable', uid, schoolId, selectedSectionId, boardDocId]);
      queryClient.setQueryData(['timetable', uid, schoolId, selectedSectionId, boardDocId], newData);
      return { previous };
    },
    onError: (err, newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['timetable', uid, schoolId, selectedSectionId, boardDocId], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['timetable', uid, schoolId, selectedSectionId, boardDocId], data);
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    }
  });
};

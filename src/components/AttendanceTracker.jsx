import React, { useState, useEffect } from 'react';
import { UserCheck, Save, X, ListTodo, ChevronLeft, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';
import { TimeService } from '../services/TimeService.js';
import { db, getDoc } from '../firebase.js'; // Import getDoc for fetching user settings
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';

const AttendanceTracker = ({ selectedSection, timetableData, onCancel, currentUser, connectedSmartboardId }) => { // Added connectedSmartboardId prop
  const [attendance, setAttendance] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [isEditingStudents, setIsEditingStudents] = useState(false);

  // Real-time listener for students
  useEffect(() => {
    if (!selectedSection?.grade || !selectedSection?.id) {
      console.log("AttendanceTracker: Skipping students listener due to missing selectedSection.grade or selectedSection.id");
      return;
    }

    const studentsPath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/students`;
    const studentsRef = collection(db, studentsPath);
    const q = query(studentsRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(fetchedStudents);
    }, (error) => {
      console.error("Error fetching students: ", error);
    });

    return () => unsubscribe();
  }, [selectedSection?.grade, selectedSection?.id]);

  // Real-time listener for attendance
  useEffect(() => {
    if (!selectedSection?.grade || !selectedSection?.id) {
      console.log("AttendanceTracker: Skipping attendance listener due to missing selectedSection.grade or selectedSection.id");
      return;
    }

    const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
    const attendanceDocRef = doc(db, attendancePath, formatDate(currentDate));

    const unsubscribe = onSnapshot(attendanceDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setAttendance(docSnapshot.data().records || {});
      } else {
        setAttendance({});
      }
    }, (error) => {
      console.error("Error fetching attendance: ", error);
    });

    return () => unsubscribe();
  }, [selectedSection?.grade, selectedSection?.id, currentDate]);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleAddStudent = async () => {
    if (newStudentName.trim() === '' || !selectedSection?.grade || !selectedSection?.id) return;
    const studentName = newStudentName.trim();
    const studentsPath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/students`;
    const studentsRef = collection(db, studentsPath);
    try {
      await setDoc(doc(studentsRef), { name: studentName });
      setNewStudentName('');
    } catch (error) {
      console.error("Error adding student: ", error);
      alert("Failed to add student.");
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!selectedSection?.grade || !selectedSection?.id) return;
    const studentDocPath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/students/${studentId}`;
    const studentDocRef = doc(db, studentDocPath);
    try {
      await deleteDoc(studentDocRef);
    } catch (error) {
      console.error("Error removing student: ", error);
      alert("Failed to remove student: " + error.message);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = async () => {
    if (!selectedSection?.grade || !selectedSection?.id || !currentDate) return;

    const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
    const attendanceDocRef = doc(db, attendancePath, formatDate(currentDate));

    try {
      await setDoc(attendanceDocRef, { records: attendance }, { merge: true });
      alert('Attendance saved successfully!');
      onCancel();
    } catch (error) {
      console.error("Error saving attendance: ", error);
      alert("Failed to save attendance.");
    }
  };

  const getTodaySchedule = () => {
    if (!timetableData || !selectedSection) return [];
    return TimeService.getTodaySchedule(timetableData, selectedSection.id);
  };

  const todaySchedule = getTodaySchedule();

  return (
    <div className="w-full h-full flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-4xl w-full mx-4 my-8 text-default-text-light dark:text-default-text-dark">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-default-text-light dark:text-default-text-dark flex items-center">
              <UserCheck className="w-6 h-6 mr-3 text-blue-500 dark:text-blue-300" />
              Attendance Tracker
            </h2>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Section: <span className="font-medium text-blue-500 dark:text-blue-300">{selectedSection.name}</span>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1)))}
              className="p-2 text-gray-700 dark:text-white/80 hover:text-blue-500 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-default-text-light dark:text-default-text-dark">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1)))}
              className="p-2 text-gray-700 dark:text-white/80 hover:text-blue-500 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Today's Classes */}
          {todaySchedule.length > 0 && (
            <div className="glass-card p-4 mb-6">
              <h3 className="font-semibold text-default-text-light dark:text-default-text-dark flex items-center mb-3">
                <ListTodo className="w-4 h-4 mr-2" />
                Classes Today
              </h3>
              <ul className="space-y-1">
                {todaySchedule.map((cls, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {cls.startTime} - {cls.endTime}: {cls.subject} ({cls.location || 'Classroom'})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Student Management */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-default-text-light dark:text-default-text-dark">Students</h3>
              <button
                onClick={() => setIsEditingStudents(!isEditingStudents)}
                className="text-sm text-blue-500 dark:text-blue-300 hover:underline"
              >
                {isEditingStudents ? 'Done' : 'Edit'}
              </button>
            </div>
            {isEditingStudents && (
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Enter student name"
                  className="flex-grow p-3 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                />
                <button
                  onClick={handleAddStudent}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white border border-blue-500/30 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            )}
          </div>

          {/* Student List for Attendance */}
          {students.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">No students added to this section yet.</p>
              <p className="text-sm text-gray-500 mt-1">Please add students to track attendance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map(student => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-white text-lg">{student.name}</span>
                  {isEditingStudents ? (
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${attendance[student.id] === 'present'
                          ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                          : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${attendance[student.id] === 'absent'
                          ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'late')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${attendance[student.id] === 'late'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                          : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        Late
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-200/50 text-default-text-light rounded-lg hover:bg-gray-300 dark:bg-white/20 dark:text-default-text-dark dark:hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Attendance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;

// src/components/AttendanceLogger.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Calendar, User, BarChart2, Check, XCircle, Clock, Plus, Trash2, Edit2, Save } from 'lucide-react';
import AttendanceDashboard from './AttendanceDashboard.jsx';

// Helper: generate all dates for a given month/year excluding Sundays
function getMonthDays(year, month) {
    const dates = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        // 0 = Sunday, skip
        if (date.getDay() !== 0) {
            dates.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

export default function AttendanceLogger({ year = new Date().getFullYear(), month = new Date().getMonth(), onClose, selectedSection }) {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today
    const [records, setRecords] = useState({}); // { studentId: status } for the selected date
    const [loading, setLoading] = useState(false);
    const [dashboardStudent, setDashboardStudent] = useState(null); // { id, name } if viewing dashboard
    const [students, setStudents] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(month);
    const [currentYear, setCurrentYear] = useState(year);

    // Student management state
    const [isEditingStudents, setIsEditingStudents] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');

    const monthDays = getMonthDays(currentYear, currentMonth);

    // Fetch students from the selected section
    useEffect(() => {
        if (!selectedSection?.grade || !selectedSection?.id) return;

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
    }, [selectedSection]);

    // Fetch records when a date is selected
    useEffect(() => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) {
            setRecords({});
            return;
        }

        setLoading(true);
        const dateKey = selectedDate.toISOString().split('T')[0];
        const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
        const attendanceDocRef = doc(db, attendancePath, dateKey);

        const unsubscribe = onSnapshot(attendanceDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setRecords(docSnapshot.data().records || {});
            } else {
                setRecords({});
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching attendance:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedDate, selectedSection]);

    const handleMark = async (studentId, status) => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) return;

        const dateKey = selectedDate.toISOString().split('T')[0];
        const finalStatus = status === 'late' ? 'present' : status;

        // Optimistic update
        setRecords(prev => ({ ...prev, [studentId]: finalStatus }));

        try {
            const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
            const attendanceDocRef = doc(db, attendancePath, dateKey);

            await setDoc(attendanceDocRef, {
                records: {
                    [studentId]: finalStatus
                }
            }, { merge: true });

        } catch (error) {
            console.error("Error saving attendance:", error);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentName.trim() || !selectedSection?.grade || !selectedSection?.id) return;

        try {
            const studentsPath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/students`;
            await setDoc(doc(collection(db, studentsPath)), {
                name: newStudentName.trim(),
                createdAt: new Date().toISOString()
            });
            setNewStudentName('');
        } catch (error) {
            console.error("Error adding student:", error);
            alert("Failed to add student.");
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!selectedSection?.grade || !selectedSection?.id) return;
        if (!window.confirm("Are you sure you want to remove this student? This action cannot be undone.")) return;

        try {
            const studentPath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/students/${studentId}`;
            await deleteDoc(doc(db, studentPath));
        } catch (error) {
            console.error("Error removing student:", error);
            alert("Failed to remove student.");
        }
    };

    const handleResetAttendance = async () => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) return;

        const confirmed = window.confirm(
            `Are you sure you want to reset all attendance for ${selectedDate.toLocaleDateString()}?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
            const attendanceDocRef = doc(db, attendancePath, dateKey);

            await deleteDoc(attendanceDocRef);
            setRecords({});
        } catch (error) {
            console.error("Error resetting attendance:", error);
            alert("Failed to reset attendance.");
        }
    };

    const exportHTML = async () => {
        if (!selectedSection?.grade || !selectedSection?.id) return;

        setLoading(true);
        try {
            // Fetch all attendance for the month
            const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
            const snapshot = await getDocs(collection(db, attendancePath));

            const monthData = {}; // { date: { studentId: status } }
            const startMonth = new Date(currentYear, currentMonth, 1);
            const endMonth = new Date(currentYear, currentMonth + 1, 0);

            snapshot.forEach(doc => {
                const dateStr = doc.id;
                const date = new Date(dateStr);
                if (date >= startMonth && date <= endMonth) {
                    monthData[dateStr] = doc.data().records || {};
                }
            });

            // Generate HTML
            const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
            const days = monthDays.map(d => d.toISOString().split('T')[0]);

            let html = `
            <html>
            <head>
              <title>Attendance Report - ${monthName}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; }
                .present { color: green; font-weight: bold; }
                .absent { color: red; font-weight: bold; }
                .late { color: orange; font-weight: bold; }
                .name { text-align: left; font-weight: 500; }
              </style>
            </head>
            <body>
              <h1>Attendance Report</h1>
              <h2>${selectedSection.name} - ${monthName}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    ${days.map(d => `<th>${d.split('-')[2]}</th>`).join('')}
                    <th>Summary (P/A/L)</th>
                  </tr>
                </thead>
                <tbody>
          `;

            students.forEach(s => {
                let p = 0, a = 0, l = 0;
                html += `<tr><td class="name">${s.name}</td>`;

                days.forEach(d => {
                    const status = monthData[d]?.[s.id] || '-';
                    let display = '-';
                    let className = '';

                    if (status === 'present') { display = 'P'; className = 'present'; p++; }
                    else if (status === 'absent') { display = 'A'; className = 'absent'; a++; }
                    else if (status === 'late') { display = 'L'; className = 'late'; l++; }

                    html += `<td class="${className}">${display}</td>`;
                });

                html += `<td>${p} / ${a} / ${l}</td></tr>`;
            });

            html += `
                </tbody>
              </table>
              <p style="margin-top: 20px; color: #666; font-size: 0.9em;">Generated on ${new Date().toLocaleString()}</p>
            </body>
            </html>
          `;

            // Download
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Attendance_Report_${selectedSection.name}_${monthName.replace(' ', '_')}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error exporting report:", error);
            alert("Failed to export report.");
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (increment) => {
        let newMonth = currentMonth + increment;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 rounded-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-bold text-white">Attendance Logger</h2>
                            <p className="text-gray-400 text-sm mt-0.5">
                                {selectedSection ? `${selectedSection.name} • ` : ''}
                                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleResetAttendance}
                            disabled={!selectedDate || Object.keys(records).length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reset attendance for selected date"
                        >
                            <Trash2 className="w-4 h-4" />
                            Reset Today
                        </button>
                        <button
                            onClick={() => setIsEditingStudents(!isEditingStudents)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isEditingStudents
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {isEditingStudents ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            {isEditingStudents ? 'Done Editing' : 'Edit Students'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">

                    {/* Date Selector Bar */}
                    <div className="p-4 border-b border-white/5 bg-black/20 flex items-center gap-4">
                        <div className="flex items-center bg-black/30 rounded-lg p-1">
                            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="px-4 font-medium text-white min-w-[140px] text-center">
                                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-2" />

                        <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-2 pb-2">
                            {monthDays.map(d => {
                                const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <button
                                        key={d.toISOString()}
                                        onClick={() => setSelectedDate(d)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${isSelected
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : isToday
                                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                                                : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                            }`}
                                    >
                                        <div className="text-xs opacity-60 mb-0.5">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                                        <div className="text-lg leading-none">{d.getDate()}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                        {/* Add Student Form */}
                        {isEditingStudents && (
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                    placeholder="Enter new student name..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                                />
                                <button
                                    onClick={handleAddStudent}
                                    disabled={!newStudentName.trim()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Student
                                </button>
                            </div>
                        )}

                        {selectedDate ? (
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                                        Loading records...
                                    </div>
                                ) : students.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">
                                        No students found in this section.
                                        {isEditingStudents && <div className="mt-2 text-sm text-blue-400">Add some students above!</div>}
                                    </div>
                                ) : (
                                    students.map(s => {
                                        const status = records[s.id];
                                        return (
                                            <div key={s.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/[0.07] transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white text-lg">{s.name}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            ID: {s.id.slice(0, 6)}...
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {isEditingStudents ? (
                                                        <button
                                                            onClick={() => handleRemoveStudent(s.id)}
                                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                                                            title="Remove Student"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                                                                <button
                                                                    onClick={() => handleMark(s.id, 'present')}
                                                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${status === 'present'
                                                                        ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                    Present
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMark(s.id, 'absent')}
                                                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${status === 'absent'
                                                                        ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    Absent
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMark(s.id, 'late')}
                                                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${status === 'late'
                                                                        ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                                                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                    Late
                                                                </button>
                                                            </div>

                                                            <div className="h-8 w-px bg-white/10" />

                                                            <button
                                                                onClick={() => setDashboardStudent(s)}
                                                                className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all group-hover:opacity-100 opacity-60"
                                                                title="View Analytics"
                                                            >
                                                                <BarChart2 className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
                                    <Calendar className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-medium text-white mb-2">Select a Date</h3>
                                <p className="text-gray-400 max-w-md">
                                    Choose a date from the bar above to start marking attendance for {selectedSection?.name || 'this class'}.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {students.length} students loaded
                        </div>
                        <div className="flex gap-3">
                            <button
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/5"
                                onClick={() => setRecords({})}
                            >
                                Reset Current View
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                                onClick={exportHTML}
                            >
                                Export Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Dashboard Modal */}
            {dashboardStudent && (
                <AttendanceDashboard
                    year={currentYear}
                    month={currentMonth}
                    student={dashboardStudent}
                    onClose={() => setDashboardStudent(null)}
                    selectedSection={selectedSection}
                />
            )}
        </div>
    );
}

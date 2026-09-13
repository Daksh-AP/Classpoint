// components/AttendanceDashboard.js — Mobile attendance reporting
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { X, User, Calendar, PieChart, TrendingUp, Download, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';

// Helper: generate all dates for a given month/year excluding Sundays
function getMonthDays(year, month) {
    const dates = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        if (date.getDay() !== 0) {
            dates.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

export default function AttendanceDashboard({ selectedSection, onClose }) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [students, setStudents] = useState([]);
    const [monthData, setMonthData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [view, setView] = useState('overview'); // 'overview' | 'student'

    const monthDays = getMonthDays(currentYear, currentMonth);
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    const gradeKey = String(selectedSection?.grade || '').startsWith('grade')
        ? selectedSection.grade
        : `grade${selectedSection?.grade || ''}`;
    const sectionPath = `schoolData/grades/gradesList/${gradeKey}/sections/${selectedSection?.id}`;

    // Fetch students
    useEffect(() => {
        if (!selectedSection?.grade || !selectedSection?.id) {
            setStudents([]);
            return undefined;
        }

        const unsubscribe = onSnapshot(collection(db, `${sectionPath}/students`), snapshot => {
            const fetchedStudents = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setStudents(fetchedStudents);
        }, error => console.error('Error listening to students:', error));

        return unsubscribe;
    }, [selectedSection, sectionPath]);

    // Fetch attendance data for the month
    useEffect(() => {
        if (!selectedSection?.grade || !selectedSection?.id) {
            setMonthData({});
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;
        const unsubscribe = onSnapshot(collection(db, `${sectionPath}/attendance`), snapshot => {
            const data = {};
            snapshot.forEach(attendanceDoc => {
                if (attendanceDoc.id.startsWith(monthPrefix)) {
                    data[attendanceDoc.id] = attendanceDoc.data().records || {};
                }
            });
            setMonthData(data);
            setLoading(false);
        }, error => {
            console.error('Error listening to attendance:', error);
            setMonthData({});
            setLoading(false);
        });

        return unsubscribe;
    }, [selectedSection, currentMonth, currentYear, sectionPath]);

    const handleMonthChange = (increment) => {
        let newMonth = currentMonth + increment;
        let newYear = currentYear;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        else if (newMonth < 0) { newMonth = 11; newYear--; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    // Calculate stats for a student
    const getStudentStats = (studentId) => {
        let present = 0, absent = 0, late = 0;
        Object.values(monthData).forEach(records => {
            if (records[studentId]) {
                const status = records[studentId];
                if (status === 'present') present++;
                if (status === 'absent') absent++;
                if (status === 'late') late++;
            }
        });
        const total = present + absent;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return { present, absent, late, total, rate };
    };

    // Calculate class-wide stats
    const getClassStats = () => {
        let totalPresent = 0, totalAbsent = 0, totalLate = 0;
        Object.values(monthData).forEach(records => {
            Object.values(records).forEach(status => {
                if (status === 'present') totalPresent++;
                if (status === 'absent') totalAbsent++;
                if (status === 'late') totalLate++;
            });
        });
        const total = totalPresent + totalAbsent;
        const rate = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
        return { present: totalPresent, absent: totalAbsent, late: totalLate, total, rate };
    };

    // Export monthly report as HTML
    const exportHTML = () => {
        const days = monthDays.map(d => d.toISOString().split('T')[0]);
        let html = `<html><head><title>Attendance Report - ${monthName}</title><style>
            body{font-family:'Segoe UI',system-ui,sans-serif;padding:30px;background:#f8f9fa}
            h1{color:#1a1a2e;margin-bottom:5px}
            h2{color:#555;font-weight:normal;margin-top:0}
            table{border-collapse:collapse;width:100%;margin-top:20px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
            th,td{border:1px solid #e2e8f0;padding:10px 8px;text-align:center;font-size:13px}
            th{background:#2d3748;color:white;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}
            .present{color:#22c55e;font-weight:bold}
            .absent{color:#ef4444;font-weight:bold}
            .late{color:#f59e0b;font-weight:bold}
            .name{text-align:left;font-weight:500;color:#1a1a2e}
            tr:nth-child(even){background:#f7fafc}
            tr:hover{background:#edf2f7}
            .footer{margin-top:20px;color:#888;font-size:12px;text-align:center}
            .summary{background:#edf2f7;font-weight:600}
        </style></head><body>
        <h1>📋 Attendance Report</h1>
        <h2>${selectedSection.name} — ${monthName}</h2>
        <table><thead><tr><th>Student</th>${days.map(d => `<th>${d.split('-')[2]}</th>`).join('')}<th class="summary">P / A / L</th><th class="summary">Rate</th></tr></thead><tbody>`;

        students.forEach(s => {
            let p = 0, a = 0, l = 0;
            html += `<tr><td class="name">${s.name}</td>`;
            days.forEach(d => {
                const status = monthData[d]?.[s.id] || '-';
                let display = '-', className = '';
                if (status === 'present') { display = '✓'; className = 'present'; p++; }
                else if (status === 'absent') { display = '✗'; className = 'absent'; a++; }
                else if (status === 'late') { display = 'L'; className = 'late'; l++; }
                html += `<td class="${className}">${display}</td>`;
            });
            const total = p + a;
            const rate = total > 0 ? Math.round((p / total) * 100) : 0;
            html += `<td class="summary">${p} / ${a} / ${l}</td>`;
            html += `<td class="summary" style="color:${rate >= 90 ? '#22c55e' : rate >= 75 ? '#f59e0b' : '#ef4444'}">${rate}%</td></tr>`;
        });

        html += `</tbody></table><p class="footer">Generated on ${new Date().toLocaleString()} • ClassPoint Attendance System</p></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Attendance_Report_${selectedSection.name}_${monthName.replace(' ', '_')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const classStats = getClassStats();

    // Render individual student report
    const renderStudentReport = () => {
        if (!selectedStudent) return null;
        const stats = getStudentStats(selectedStudent.id);

        return (
            <div className="space-y-6">
                {/* Back button */}
                <button
                    onClick={() => { setSelectedStudent(null); setView('overview'); }}
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Overview</span>
                </button>

                {/* Student header */}
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                        {selectedStudent.name.charAt(0)}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h3>
                    <p className="text-gray-500">{monthName}</p>
                </div>

                {/* Ring chart */}
                <div className="flex justify-center py-4">
                    <div className="relative">
                        <svg className="w-40 h-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                            <circle
                                cx="80" cy="80" r="70"
                                stroke={stats.rate >= 90 ? '#22c55e' : stats.rate >= 75 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={440}
                                strokeDashoffset={440 - (440 * stats.rate) / 100}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-gray-900">{stats.rate}%</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">Attendance</span>
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">{stats.present}</div>
                        <div className="text-xs text-green-600 uppercase tracking-wider font-medium">Present</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-600 mb-1">{stats.absent}</div>
                        <div className="text-xs text-red-600 uppercase tracking-wider font-medium">Absent</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.late}</div>
                        <div className="text-xs text-yellow-600 uppercase tracking-wider font-medium">Late</div>
                    </div>
                </div>

                {/* Day-by-day breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h4 className="font-semibold text-gray-900">Day-by-Day</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {monthDays.map(d => {
                            const dateKey = d.toISOString().split('T')[0];
                            const status = monthData[dateKey]?.[selectedStudent.id];
                            return (
                                <div key={dateKey} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-700">
                                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                                        status === 'present' ? 'bg-green-100 text-green-700' :
                                        status === 'absent' ? 'bg-red-100 text-red-700' :
                                        status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                        {status === 'present' ? 'Present' :
                                         status === 'absent' ? 'Absent' :
                                         status === 'late' ? 'Late' : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Based on {stats.total} recorded days in {monthName}</span>
                </div>
            </div>
        );
    };

    // Render overview with class stats and student list
    const renderOverview = () => (
        <div className="space-y-6">
            {/* Class Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{classStats.rate}%</div>
                    <div className="text-xs text-blue-600 uppercase tracking-wider font-medium">Overall Rate</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{classStats.present}</div>
                    <div className="text-xs text-green-600 uppercase tracking-wider font-medium">Present</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-600 mb-1">{classStats.absent}</div>
                    <div className="text-xs text-red-600 uppercase tracking-wider font-medium">Absent</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">{classStats.late}</div>
                    <div className="text-xs text-yellow-600 uppercase tracking-wider font-medium">Late</div>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Students ({students.length})</span>
                    </h4>
                    <span className="text-xs text-gray-400">Tap for details</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {students.map(s => {
                        const stats = getStudentStats(s.id);
                        return (
                            <button
                                key={s.id}
                                onClick={() => { setSelectedStudent(s); setView('student'); }}
                                className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                        {s.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-900 block">{s.name}</span>
                                        <span className="text-xs text-gray-500">Monthly count</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs font-semibold text-gray-600">P {stats.present}</span>
                                    <span className="text-xs font-semibold text-gray-600">A {stats.absent}</span>
                                    <span className="text-xs font-semibold text-gray-600">L {stats.late}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                            <BarChart2 className="w-5 h-5 text-primary-600" />
                            <span>Attendance Reports</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{selectedSection?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Month Selector */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
                    <button
                        onClick={() => handleMonthChange(-1)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="font-semibold text-gray-900">{monthName}</span>
                    <button
                        onClick={() => handleMonthChange(1)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                            <span>Loading attendance data...</span>
                        </div>
                    ) : view === 'student' ? (
                        renderStudentReport()
                    ) : (
                        renderOverview()
                    )}
                </div>

                {/* Footer — Export button only on overview */}
                {view === 'overview' && !loading && (
                    <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
                        <span className="text-sm text-gray-400">{Object.keys(monthData).length} days recorded</span>
                        <button
                            onClick={exportHTML}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-md font-medium"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Monthly Report</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

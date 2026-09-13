// src/components/AttendanceDashboard.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { X, User, Calendar, PieChart, TrendingUp } from 'lucide-react';
import { useSchoolId } from '../hooks/useSchoolId';

export default function AttendanceDashboard({ year = new Date().getFullYear(), month = new Date().getMonth(), student, onClose, selectedSection }: any) {
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
    const [students, setStudents] = useState<any[]>([]);
    const [monthData, setMonthData] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const schoolId = useSchoolId();

    useEffect(() => {
        if (!selectedSection?.grade || !selectedSection?.id) return undefined;

        const gradeKey = String(selectedSection.grade).startsWith('grade') ? selectedSection.grade : `grade${selectedSection.grade}`;
        const sectionPath = `schools/${schoolId}/grades/${gradeKey}/sections/${selectedSection.id}`;
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
        setLoading(true);

        const unsubscribeStudents = onSnapshot(collection(db, `${sectionPath}/students`), snapshot => {
            setStudents(snapshot.docs
                .filter(studentDoc => !studentDoc.data().isDeleted)
                .map(studentDoc => ({ id: studentDoc.id, ...studentDoc.data() }))
                .sort((first: any, second: any) => (first.name || '').localeCompare(second.name || '')));
        });
        const unsubscribeAttendance = onSnapshot(collection(db, `${sectionPath}/attendance`), snapshot => {
            const data: Record<string, Record<string, string>> = {};
            snapshot.forEach(attendanceDoc => {
                if (attendanceDoc.id.startsWith(monthPrefix)) {
                    data[attendanceDoc.id] = attendanceDoc.data().records || {};
                }
            });
            setMonthData(data);
            setLoading(false);
        }, () => {
            setMonthData({});
            setLoading(false);
        });

        return () => {
            unsubscribeStudents();
            unsubscribeAttendance();
        };
    }, [year, month, student, selectedSection]);

    useEffect(() => {
        let present = 0;
        let absent = 0;
        let late = 0;
        if (student) {
            Object.values(monthData).forEach(records => {
                const status = records[student.id];
                if (status === 'present') present++;
                if (status === 'absent') absent++;
                if (status === 'late') late++;
            });
        } else {
            Object.values(monthData).forEach(records => Object.values(records).forEach(status => {
                if (status === 'present') present++;
                if (status === 'absent') absent++;
                if (status === 'late') late++;
            }));
        }
        setStats({ present, absent, late, total: present + absent });
    }, [monthData, student]);

    const getStudentStats = (studentId: string) => {
        const counts = { present: 0, absent: 0, late: 0 };
        Object.values(monthData).forEach(records => {
            const status = records[studentId];
            if (status === 'present') counts.present++;
            if (status === 'absent') counts.absent++;
            if (status === 'late') counts.late++;
        });
        return counts;
    };

    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xl flex items-center justify-center z-[150] animate-in zoom-in-95 duration-300">
            <div className="w-full max-w-lg bg-zen-surface border border-white/10 rounded-[32px] shadow-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                            {student ? (
                                <>
                                    <User className="w-5 h-5 text-blue-400" />
                                    {student.name}
                                </>
                            ) : (
                                <>
                                    <PieChart className="w-5 h-5 text-blue-400" />
                                    Class Report
                                </>
                            )}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {monthName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#FF453A] transition-all active:scale-95"
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                            Calculating stats...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Big Stat */}
                            <div className="relative flex flex-col items-center justify-center py-4">
                                <div className="relative">
                                    <svg className="w-40 h-40 transform -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            className="text-white/5"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * attendanceRate) / 100}
                                            className={`transition-all duration-1000 ease-out ${attendanceRate >= 90 ? 'text-green-500' :
                                                attendanceRate >= 75 ? 'text-yellow-500' : 'text-red-500'
                                                }`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-bold text-white">{attendanceRate}%</span>
                                        <span className="text-xs text-gray-400 uppercase tracking-wider mt-1">Attendance</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grid Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center hover:bg-green-500/20 transition-colors">
                                    <div className="text-2xl font-bold text-green-400 mb-1">{stats.present}</div>
                                    <div className="text-xs text-green-500/70 uppercase tracking-wider font-medium">Present</div>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center hover:bg-red-500/20 transition-colors">
                                    <div className="text-2xl font-bold text-red-400 mb-1">{stats.absent}</div>
                                    <div className="text-xs text-red-500/70 uppercase tracking-wider font-medium">Absent</div>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center hover:bg-yellow-500/20 transition-colors">
                                    <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.late}</div>
                                    <div className="text-xs text-yellow-500/70 uppercase tracking-wider font-medium">Late</div>
                                </div>
                            </div>

                            {!student && (
                                <div className="border border-white/10 rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold text-white">
                                        Monthly student counts
                                    </div>
                                    {students.map((studentRecord) => {
                                        const counts = getStudentStats(studentRecord.id);
                                        return (
                                            <div key={studentRecord.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
                                                <span className="text-sm text-gray-200">{studentRecord.name}</span>
                                                <span className="text-xs text-gray-400">P {counts.present} / A {counts.absent} / L {counts.late}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer Info */}
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-white/5 py-3 rounded-lg">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Based on {stats.total} recorded days in {monthName}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

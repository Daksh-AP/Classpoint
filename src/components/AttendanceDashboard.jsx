// src/components/AttendanceDashboard.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { X, User, Calendar, PieChart, TrendingUp } from 'lucide-react';

export default function AttendanceDashboard({ year, month, student, onClose, selectedSection }) {
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!selectedSection?.grade || !selectedSection?.id) return;

            setLoading(true);
            try {
                // We need to fetch all attendance docs for the month
                // Since docs are named by date (YYYY-MM-DD), we can fetch the collection and filter by ID
                const attendancePath = `schoolData/grades/gradesList/${selectedSection.grade}/sections/${selectedSection.id}/attendance`;
                const attendanceRef = collection(db, attendancePath);

                const snapshot = await getDocs(attendanceRef);

                let present = 0;
                let absent = 0;
                let late = 0;

                const startMonth = new Date(year, month, 1);
                const endMonth = new Date(year, month + 1, 0);

                snapshot.forEach(doc => {
                    const dateStr = doc.id; // YYYY-MM-DD
                    const date = new Date(dateStr);

                    // Check if date is within the selected month
                    if (date >= startMonth && date <= endMonth) {
                        const data = doc.data();
                        const records = data.records || {};

                        // Check student status
                        if (student && records[student.id]) {
                            const status = records[student.id];
                            if (status === 'present') present++;
                            if (status === 'absent') absent++;
                            if (status === 'late') {
                                late++;
                                present++; // Late counts as present usually, or we can keep separate
                            }
                        } else if (!student) {
                            // Class report logic (aggregate)
                            // This is more complex, let's just sum up everything for now
                            Object.values(records).forEach(status => {
                                if (status === 'present') present++;
                                if (status === 'absent') absent++;
                                if (status === 'late') {
                                    late++;
                                    present++;
                                }
                            });
                        }
                    }
                });

                setStats({ present, absent, late, total: present + absent }); // Total usually excludes late if late is part of present
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [year, month, student, selectedSection]);

    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] animate-in zoom-in-95 duration-200">
            <div className="glass-card w-full max-w-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

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
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
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

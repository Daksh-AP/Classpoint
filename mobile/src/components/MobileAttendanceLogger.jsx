import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Calendar, Check, X, Clock, User } from 'lucide-react';

export default function MobileAttendanceLogger({ section, onBack }) {
    const [date, setDate] = useState(new Date());
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch students
    useEffect(() => {
        const studentsPath = `schoolData/grades/gradesList/${section.grade}/sections/${section.id}/students`;
        const q = query(collection(db, studentsPath), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [section]);

    // Fetch records
    useEffect(() => {
        const dateKey = date.toISOString().split('T')[0];
        const path = `schoolData/grades/gradesList/${section.grade}/sections/${section.id}/attendance`;
        const unsubscribe = onSnapshot(doc(db, path, dateKey), (docSnap) => {
            setRecords(docSnap.exists() ? docSnap.data().records || {} : {});
        });
        return () => unsubscribe();
    }, [section, date]);

    const toggleStatus = async (studentId) => {
        const current = records[studentId] || 'present';

        const nextStatus = {
            'present': 'absent',
            'absent': 'late',
            'late': 'present'
        };

        // If undefined, treat as 'present' (marking it for the first time)
        // Wait, if it's undefined, clicking it should probably set it to 'present'.
        // If it is 'present', clicking it should set it to 'absent'.
        const newStatus = records[studentId] ? nextStatus[records[studentId]] : 'present';

        // Optimistic
        setRecords(prev => ({ ...prev, [studentId]: newStatus }));

        const dateKey = date.toISOString().split('T')[0];
        const path = `schoolData/grades/gradesList/${section.grade}/sections/${section.id}/attendance`;
        await setDoc(doc(db, path, dateKey), {
            records: { [studentId]: newStatus }
        }, { merge: true });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'absent': return 'bg-red-500/20 border-red-500/50 text-red-400';
            case 'late': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
            default: return 'bg-white/5 border-white/10 text-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <Check className="w-5 h-5" />;
            case 'absent': return <X className="w-5 h-5" />;
            case 'late': return <Clock className="w-5 h-5" />;
            default: return <User className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="p-4 bg-slate-800 border-b border-white/10 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-lg leading-tight">{section.name}</h2>
                    <p className="text-xs text-gray-400">{date.toDateString()}</p>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">
                    <Calendar className="w-5 h-5" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                {students.map(student => {
                    const status = records[student.id];
                    return (
                        <button
                            key={student.id}
                            onClick={() => toggleStatus(student.id)}
                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${getStatusColor(status)}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${status ? 'bg-white/10' : 'bg-white/5'}`}>
                                    {student.name.charAt(0)}
                                </div>
                                <span className="font-medium text-lg">{student.name}</span>
                            </div>
                            <div className="p-2 rounded-full bg-black/20">
                                {getStatusIcon(status)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Stats Footer */}
            <div className="p-4 bg-slate-800 border-t border-white/10 flex justify-around text-sm font-medium fixed bottom-0 w-full">
                <div className="text-green-400">P: {Object.values(records).filter(s => s === 'present').length}</div>
                <div className="text-red-400">A: {Object.values(records).filter(s => s === 'absent').length}</div>
                <div className="text-yellow-400">L: {Object.values(records).filter(s => s === 'late').length}</div>
            </div>
        </div>
    );
}

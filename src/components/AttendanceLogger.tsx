// src/components/AttendanceLogger.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, query, getDoc, orderBy, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Calendar, User, Check, XCircle, Plus, Trash2, Edit2, Save, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { paths } from '../lib/firebase/paths';
import { useSchoolId } from '../hooks/useSchoolId';

// Helper: generate all dates for a given month/year excluding Sundays
function getMonthDays(year: any, month: any) {
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

const getGradeNumber = (grade: any) => {
    if (!grade) return '';
    const gradeStr = String(grade).trim();
    const digits = gradeStr.match(/\d+/);
    if (digits) return digits[0];
    const normalized = gradeStr.toLowerCase().replace(/\s+/g, '');
    return normalized.startsWith('grade') ? normalized.replace(/^grade/, '') : normalized;
};

const StudentRow = React.memo(({ student, status, isEditingStudents, onRemove, onMark }: any) => {
    return (
        <div className="group flex items-center justify-between p-4 zen-card-flat transition-all">
            <div className="flex items-center gap-4">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                    style={{ background: 'var(--accent)', color: '#FFFFFF' }}
                >
                    {student.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-body font-medium truncate">{student.name}</div>
                    <div className="text-small flex items-center gap-1" style={{ opacity: 0.5 }}>
                        <User className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                        ID: {student.id.slice(0, 6)}...
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isEditingStudents ? (
                    <button
                        onClick={() => onRemove(student.id)}
                        className="p-3 rounded-lg transition-colors hover:bg-black/5"
                        style={{ color: 'var(--danger, #DC3C3C)' }}
                        title="Remove Student"
                        aria-label="Remove Student"
                    >
                        <Trash2 className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                ) : (
                    <div
                        className="flex rounded-lg p-1.5"
                        style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
                    >
                        <button
                            onClick={() => onMark(student.id, 'present')}
                            className="flex items-center gap-2 px-5 py-3 rounded-md text-small font-medium transition-all"
                            style={{
                                background: status === 'present' ? 'color-mix(in srgb, var(--success, #34C759) 15%, transparent)' : 'transparent',
                                color: status === 'present' ? 'var(--success, #34C759)' : 'var(--text-secondary)',
                                boxShadow: status === 'present' ? `0 0 10px color-mix(in srgb, var(--success, #34C759) 15%, transparent)` : 'none',
                                transitionDuration: 'var(--motion-fast)',
                            }}
                        >
                            <Check className="w-5 h-5" strokeWidth={1.5} />
                            Present
                        </button>
                        <button
                            onClick={() => onMark(student.id, 'absent')}
                            className="flex items-center gap-2 px-5 py-3 rounded-md text-small font-medium transition-all"
                            style={{
                                background: status === 'absent' ? 'color-mix(in srgb, var(--danger, #FF3B30) 15%, transparent)' : 'transparent',
                                color: status === 'absent' ? 'var(--danger, #FF3B30)' : 'var(--text-secondary)',
                                boxShadow: status === 'absent' ? `0 0 10px color-mix(in srgb, var(--danger, #FF3B30) 15%, transparent)` : 'none',
                                transitionDuration: 'var(--motion-fast)',
                            }}
                        >
                            <XCircle className="w-5 h-5" strokeWidth={1.5} />
                            Absent
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default function AttendanceLogger({ year = new Date().getFullYear(), month = new Date().getMonth(), onClose, selectedSection }: any) {
    const schoolId = useSchoolId();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [records, setRecords] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    // Tracks the latest fetch request to discard results from stale async calls (race condition fix)
    const fetchIdRef = useRef(0);

    const [students, setStudents] = useState<any[]>([]);
    const [currentMonth, setCurrentMonth] = useState(month);
    const [currentYear, setCurrentYear] = useState(year);
    const [isEditingStudents, setIsEditingStudents] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [filter, setFilter] = useState('all');

    const monthDays = getMonthDays(currentYear, currentMonth);

    useEffect(() => {
        if (!selectedSection?.grade || !selectedSection?.id) return;
        const gradeNum = getGradeNumber(selectedSection.grade);
        if (!gradeNum) return;
        const studentsPath = paths.students(gradeNum, selectedSection.id);
        const studentsRef = collection(db, studentsPath);
        const q = query(studentsRef, orderBy('name'));
        getDocs(q).then((snapshot: any) => {
            const fetchedStudents = snapshot.docs
                .filter((doc: any) => !doc.data().isDeleted)
                .map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setStudents(fetchedStudents);
        }, (error: any) => {
// /* console.error */ ("Error fetching students: ", error);
        });
        
    }, [selectedSection]);

    useEffect(() => {
        let timer: any
        if (selectedDate) {
            // Wait for DOM layout to settle before scrolling
            timer = setTimeout(() => {
                const dateKey = selectedDate.toISOString().split('T')[0];
                const el = document.getElementById(`date-${dateKey}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 50);
        }
        return () => clearTimeout(timer);
    }, [selectedDate, currentMonth]);

    const unsavedChangesRef = useRef(unsavedChanges);
    useEffect(() => {
        unsavedChangesRef.current = unsavedChanges;
    }, [unsavedChanges]);

    useEffect(() => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) {
            setRecords({});
            setUnsavedChanges(false);
            return;
        }

        setUnsavedChanges(false);
        unsavedChangesRef.current = false;

        const gradeNum = getGradeNumber(selectedSection.grade);
        if (!gradeNum) return;

        const dateKey = selectedDate.toISOString().split('T')[0];
        const attendanceDocRef = doc(db, paths.attendanceDoc(gradeNum, selectedSection.id, dateKey));

        setLoading(true);

        fetchIdRef.current += 1;
        const currentFetchId = fetchIdRef.current;

        const unsubscribe = onSnapshot(
            attendanceDocRef,
            (docSnapshot: any) => {
                if (currentFetchId !== fetchIdRef.current) return;
                setLoading(false);
                if (docSnapshot.exists()) {
                    if (!unsavedChangesRef.current) {
                        setRecords(docSnapshot.data().records || {});
                    }
                } else {
                    if (!unsavedChangesRef.current) {
                        setRecords({});
                    }
                }
            },
            (error: any) => {
                if (currentFetchId !== fetchIdRef.current) return;
                setLoading(false);
// /* console.error */ ("Error listening to attendance changes:", error);
                toast.error("Failed to sync attendance in real-time.");
            }
        );

        
    }, [selectedDate, selectedSection]);

    const handleMark = useCallback((studentId: any, status: any) => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) return;
        setRecords((prev: any) => ({ ...prev, [studentId]: status }));
        setUnsavedChanges(true);
    }, [selectedDate, selectedSection]);

    const handleSaveChanges = async () => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) return;
        setIsSaving(true);
        try {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const gradeNum = getGradeNumber(selectedSection.grade);
            if (!gradeNum) {
                throw new Error('Invalid grade value for attendance path');
            }
            const attendanceDocPath = paths.attendanceDoc(gradeNum, selectedSection.id, dateKey);
            const attendanceDocRef = doc(db, attendanceDocPath);

            const presentCount = Object.values(records).filter((status: any) => status === 'present').length;
            const absentCount = Object.values(records).filter((status: any) => status === 'absent').length;
            await setDoc(attendanceDocRef, {
                classId: selectedSection.id,
                grade: String(gradeNum),
                schoolId: schoolId,
                date: dateKey,
                updatedAt: new Date(),
                records,
                presentCount,
                absentCount
            }, { merge: true });
            setUnsavedChanges(false);
        } catch (err: any) {
// /* console.error */ ("Error saving attendance:", err);
// /* console.error */ ('Auth user on attendance save:', auth.currentUser);
            const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
            toast.error(`Failed to save changes: ${message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkAllPresent = () => {
        const newRecords = { ...records };
        students.forEach((s: any) => {
            newRecords[s.id] = 'present';
        });
        setRecords(newRecords);
        setUnsavedChanges(true);
    };

    const handleMarkAllAbsent = () => {
        const newRecords = { ...records };
        students.forEach((s: any) => {
            newRecords[s.id] = 'absent';
        });
        setRecords(newRecords);
        setUnsavedChanges(true);
    };

    const handleAddStudent = async () => {
        if (!newStudentName.trim() || !selectedSection?.grade || !selectedSection?.id) return;
        try {
            const gradeNum = getGradeNumber(selectedSection.grade);
            if (!gradeNum) throw new Error('Invalid grade value');
            const studentsPath = paths.students(gradeNum, selectedSection.id);
            await setDoc(doc(collection(db, studentsPath)), {
                name: newStudentName.trim(),
                createdAt: new Date().toISOString()
            });
            setNewStudentName('');
        } catch (error: any) {
// /* console.error */ ("Error adding student:", error);
            toast.error("Failed to add student.");
        }
    };

    const handleFileUpload = async (event: any) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e: any) => {
            const text = e.target.result;
            const lines = text.split('\n').map((line: any) => line.trim()).filter((line: any) => line);
            if (lines.length === 0) return;

            const newStudents = lines.map((line: any) => {
                const parts = line.split(',');
                return parts[0].trim();
            }).filter((name: any) => name.length > 0 && name.toLowerCase() !== 'name' && name.toLowerCase() !== 'student name');

            if (newStudents.length === 0) {
                toast.error("No valid names found in CSV.");
                return;
            }

            toast(
                (t) => (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-medium">Found {newStudents.length} students. Add them?</p>
                        <div className="flex gap-2 justify-end">
                            <button className="zen-btn text-xs px-3 py-1 bg-black/5" onClick={() => toast.dismiss(t.id)}>Cancel</button>
                            <button className="zen-btn-accent text-xs px-3 py-1 text-white rounded-md bg-blue-500" onClick={async () => {
                                toast.dismiss(t.id);
                                try {
                                    const gradeNum = getGradeNumber(selectedSection.grade);
                                    if (!gradeNum) throw new Error('Invalid grade value');
                                    const studentsPath = paths.students(gradeNum, selectedSection.id);
                                    const batch = writeBatch(db);
                                    
                                    newStudents.forEach((name: any) => {
                                        const newStudentRef = doc(collection(db, studentsPath));
                                        batch.set(newStudentRef, {
                                            name: name,
                                            createdAt: new Date().toISOString()
                                        });
                                    });
                                    
                                    await batch.commit();
                                    toast.success(`Successfully added ${newStudents.length} students.`);
                                } catch (err) {
// /* console.error */ ("Error importing students:", err);
                                    toast.error("Failed to import students. Please try again.");
                                }
                            }}>Add Students</button>
                        </div>
                    </div>
                ),
                { duration: Infinity }
            );
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const handleRemoveStudent = useCallback(async (studentId: any) => {
        if (!selectedSection?.grade || !selectedSection?.id) return;
        toast(
            (t) => (
                <div className="flex flex-col gap-4">
                    <p className="text-sm font-medium">Are you sure you want to remove this student? This action cannot be undone.</p>
                    <div className="flex gap-2 justify-end">
                        <button className="zen-btn text-xs px-3 py-1 bg-black/5" onClick={() => toast.dismiss(t.id)}>Cancel</button>
                        <button className="zen-btn-accent text-xs px-3 py-1 text-white rounded-md bg-red-500" onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                const gradeNum = getGradeNumber(selectedSection.grade);
                                if (!gradeNum) throw new Error('Invalid grade value');
                                const studentPath = paths.student(gradeNum, selectedSection.id, studentId);
                                await deleteDoc(doc(db, studentPath));
                                toast.success("Student removed.");
                            } catch (error: any) {
// /* console.error */ ("Error removing student:", error);
                                toast.error("Failed to remove student.");
                            }
                        }}>Remove</button>
                    </div>
                </div>
            ),
            { duration: Infinity }
        );
    }, [selectedSection]);

    const handleResetAttendance = async () => {
        if (!selectedDate || !selectedSection?.grade || !selectedSection?.id) return;
        toast(
            (t) => (
                <div className="flex flex-col gap-4">
                    <p className="text-sm font-medium">Are you sure you want to reset all attendance for {selectedDate.toLocaleDateString()}?<br/><br/>This action cannot be undone.</p>
                    <div className="flex gap-2 justify-end">
                        <button className="zen-btn text-xs px-3 py-1 bg-black/5" onClick={() => toast.dismiss(t.id)}>Cancel</button>
                        <button className="zen-btn-accent text-xs px-3 py-1 text-white rounded-md bg-red-500" onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                const dateKey = selectedDate.toISOString().split('T')[0];
                                const gradeNum = getGradeNumber(selectedSection.grade);
                                if (!gradeNum) throw new Error('Invalid grade value');
                                const attendanceDocRef = doc(db, paths.attendanceDoc(gradeNum, selectedSection.id, dateKey));
                                await deleteDoc(attendanceDocRef);
                                setRecords({});
                                toast.success("Attendance reset.");
                            } catch (error: any) {
// /* console.error */ ("Error resetting attendance:", error);
                                toast.error("Failed to reset attendance.");
                            }
                        }}>Reset</button>
                    </div>
                </div>
            ),
            { duration: Infinity }
        );
    };



    const handleMonthChange = (increment: any) => {
        let newMonth = currentMonth + increment;
        let newYear = currentYear;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        else if (newMonth < 0) { newMonth = 11; newYear--; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    // Status colors — updated to use CSS variables with fallbacks for dark mode support
    const statusColors = {
        present: { bg: 'color-mix(in srgb, var(--success, #34C759) 15%, transparent)', text: 'var(--success, #34C759)', shadow: 'color-mix(in srgb, var(--success, #34C759) 15%, transparent)' },
        absent: { bg: 'color-mix(in srgb, var(--danger, #FF3B30) 15%, transparent)', text: 'var(--danger, #FF3B30)', shadow: 'color-mix(in srgb, var(--danger, #FF3B30) 15%, transparent)' },
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
                className="w-full max-w-5xl h-[90vh] bg-zen-surface rounded-[32px] border border-zen-text/10 shadow-2xl overflow-hidden flex flex-col pt-2 animate-slide-up"
            >
                {/* Header */}
                <div
                    className="p-6 flex justify-between items-center"
                    style={{ borderBottom: '1px solid var(--glass-border)' }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="p-3 rounded-xl"
                            style={{ background: '#FFFFFF', color: 'var(--accent)' }}
                        >
                            <Calendar className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-h2">Attendance Logger</h2>
                            <p className="text-body mt-1" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                {selectedSection ? selectedSection.name : ''}
                                <span className="text-small font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleResetAttendance}
                            disabled={!selectedDate || Object.keys(records).length === 0}
                            className="zen-btn text-small disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ color: 'var(--danger, #DC3C3C)', borderColor: 'color-mix(in srgb, var(--danger, #DC3C3C) 20%, transparent)' }}
                        >
                            <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                            Reset Today
                        </button>

                        {unsavedChanges && (
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                                className="zen-btn text-small px-5 py-3"
                                style={{ background: 'var(--success, #34C759)', color: '#FFF' }}
                            >
                                <Save className="w-5 h-5" strokeWidth={1.5} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-3 rounded-full transition-all active:scale-95 hover:bg-black/5"
                            style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
                            aria-label="Close"
                        >
                            <X className="w-6 h-6" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">

                    {/* Date Selector Bar */}
                    <div
                        className="p-4 flex items-center gap-4"
                        style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--surface)' }}
                    >
                        <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--glass-bg)' }}>
                            <button onClick={() => handleMonthChange(-1)} className="p-3 rounded-md transition-colors" style={{ color: 'var(--text-secondary)' }} aria-label="Previous Month">
                                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
                            </button>
                            <span className="px-4 font-medium min-w-[140px] text-center text-body">
                                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => handleMonthChange(1)} className="p-3 rounded-md transition-colors" style={{ color: 'var(--text-secondary)' }} aria-label="Next Month">
                                <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="h-8 w-px" style={{ background: 'var(--glass-border)' }} />

                        <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-4 px-4 pb-2 relative" id="date-scroll-container">
                            {monthDays.map((d: any) => {
                                const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <button
                                        key={d.toISOString()}
                                        id={`date-${d.toISOString().split('T')[0]}`}
                                        onClick={() => setSelectedDate(d)}
                                        className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-all"
                                        style={{
                                            background: isSelected ? 'var(--accent)' : isToday ? 'var(--glass-bg)' : 'transparent',
                                            color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                            boxShadow: isSelected ? '0 4px 15px var(--shadow)' : 'none',
                                            transitionDuration: 'var(--motion-medium)',
                                        }}
                                    >
                                        <div className="text-xs font-medium mb-1" style={{ opacity: isSelected ? 0.9 : 0.5 }}>
                                            {d.toLocaleDateString(undefined, { weekday: 'short' })}
                                        </div>
                                        <div className="text-xl font-semibold leading-none">
                                            {d.getDate()}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 overflow-y-auto p-6">



                        {selectedDate ? (
                            <div className="space-y-2">
                                {/* Filter Bar */}
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 justify-between items-center">
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'all', label: 'All Students' },
                                            { id: 'present', label: 'Present' },
                                            { id: 'absent', label: 'Absent' },
                                            { id: 'unmarked', label: 'Unmarked' }
                                        ].map((f: any) => (
                                            <button
                                                key={f.id}
                                                onClick={() => setFilter(f.id)}
                                                className="px-4 py-2 rounded-full text-small font-medium whitespace-nowrap transition-all"
                                                style={{
                                                    background: filter === f.id ? 'var(--accent)' : 'var(--surface)',
                                                    color: filter === f.id ? '#FFFFFF' : 'var(--text-secondary)',
                                                    border: `1px solid ${filter === f.id ? 'var(--accent)' : 'var(--glass-border)'}`,
                                                    transitionDuration: 'var(--motion-fast)',
                                                }}
                                                aria-pressed={filter === f.id}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    {!isEditingStudents && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={handleMarkAllPresent}
                                                className="px-4 py-2 rounded-full text-small font-medium transition-all hover:bg-black/5 flex items-center"
                                                style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                                            >
                                                <Check className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                                                All Present
                                            </button>
                                            <button
                                                onClick={handleMarkAllAbsent}
                                                className="px-4 py-2 rounded-full text-small font-medium transition-all hover:bg-black/5 flex items-center"
                                                style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                                            >
                                                <XCircle className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                                                All Absent
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
                                            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                                        />
                                        <span className="text-small">Loading records...</span>
                                    </div>
                                ) : students.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-small">No students found in this section.</p>
                                    </div>
                                ) : (
                                    students
                                        .filter((s: any) => {
                                            if (filter === 'all') return true;
                                            const status = records[s.id];
                                            if (filter === 'unmarked') return !status;
                                            return status === filter;
                                        })
                                        .map((s: any) => (
                                            <StudentRow
                                                key={s.id}
                                                student={s}
                                                status={records[s.id]}
                                                isEditingStudents={isEditingStudents}
                                                onRemove={handleRemoveStudent}
                                                onMark={handleMark}
                                            />
                                        ))
                                )}
                            </div>
                        ) : (
                            <div
                                className="h-full flex flex-col items-center justify-center text-center p-8 rounded-xl"
                                style={{ border: '2px dashed var(--glass-border)' }}
                            >
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                    style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
                                >
                                    <Calendar className="w-8 h-8" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-h3 mb-2">Select a Date</h3>
                                <p className="text-small max-w-md">
                                    Choose a date from the bar above to start marking attendance for {selectedSection?.name || 'this class'}.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        className="p-4 flex justify-between items-center"
                        style={{ borderTop: '1px solid var(--glass-border)' }}
                    >
                        <span className="text-small">{students.length} students loaded</span>
                        <div className="flex gap-3">
                            <button className="zen-btn text-small" onClick={() => setRecords({})}>
                                Reset Current View
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}



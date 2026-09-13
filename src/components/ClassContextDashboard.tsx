import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
    Activity, 
    Clock, 
    User, 
    BookOpen, 
    ChevronRight, 
    AlertCircle, 
    CheckCircle2, 
    ArrowRight,
    Search,
    Plus,
    Edit2,
    Delete,
    X
} from 'lucide-react';
import DetailedContextCard from './DetailedContextCard';
import ClassContextEditor from './ClassContextEditor';
import { useSchoolId } from '../hooks/useSchoolId';
import { matchesSectionAndGrade } from '../utils/sectionUtils';

const statusColors: any= {
    complete: '#30D158',
    partial: '#FF9F0A',
    incomplete: '#FF453A'
};

const ClassContextDashboard = ({ selectedSection }: any) => {
    const [contexts, setContexts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingContext, setEditingContext] = useState<any | null>(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showPinPrompt, setShowPinPrompt] = useState<any | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [scrambledPad, setScrambledPad] = useState<any[]>([]);
    const schoolId = useSchoolId();

    const handlePinSubmit = (pin: any) => {
        if (pin === '1234') {
            setIsUnlocked(true);
            setPinError('');
            if (showPinPrompt === 'create') {
                setIsCreating(true);
            } else if (showPinPrompt) {
                setEditingContext(showPinPrompt);
            }
            setShowPinPrompt(null);
            setPinInput('');
        } else {
            setPinError('Incorrect PIN');
            setPinInput('');
        }
    };

    const handleKeypadPress = (val: any) => {
        if (val === 'Cancel') {
            setShowPinPrompt(null);
            setPinInput('');
            setPinError('');
        } else if (val === 'Del') {
            setPinInput((prev: any) => prev.slice(0, -1));
            setPinError('');
        } else {
            setPinInput((prev: any) => {
                const newVal = prev + val;
                setPinError('');
                if (newVal.length === 4) {
                    setTimeout(() => handlePinSubmit(newVal), 50);
                }
                return newVal;
            });
        }
    };

    // All hooks AFTER state and functions
    useEffect(() => {
        if (showPinPrompt) {
            const digits: any[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            for (let i = digits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [digits[i], digits[j]] = [digits[j], digits[i]];
            }
            setScrambledPad([
                digits[0], digits[1], digits[2],
                digits[3], digits[4], digits[5],
                digits[6], digits[7], digits[8],
                'Cancel', digits[9], 'Del'
            ]);
        }
    }, [showPinPrompt]);

    useEffect(() => {
        if (!selectedSection) {
            setContexts([]);
            setLoading(false);
            return;
        }

        const effectiveSchoolId = schoolId || 'default_school';
        const statesRef = collection(db, `schools/${effectiveSchoolId}/subjectStates`);
        const entriesRef = collection(db, `schools/${effectiveSchoolId}/lessonEntries`);

        let statesDocs: any[] = [];
        let entriesDocs: any[] = [];

        const updateMergedContexts = () => {
            const matchedStates = statesDocs.filter((ctx) => matchesSectionAndGrade(ctx, selectedSection));
            const matchedEntries = entriesDocs.filter((entry) => !entry.deleted && matchesSectionAndGrade(entry, selectedSection));

            // Map by subject lower case to deduplicate and merge
            const contextMap = new Map<string, any>();
            matchedStates.forEach((ctx) => {
                if (ctx.subject) {
                    contextMap.set(ctx.subject.toLowerCase(), ctx);
                }
            });

            // If an entry exists for a subject not yet in subjectStates (or newer), incorporate it
            matchedEntries.forEach((entry) => {
                if (!entry.subject) return;
                const subKey = entry.subject.toLowerCase();
                const existing = contextMap.get(subKey);

                if (!existing) {
                    contextMap.set(subKey, {
                        id: entry.id,
                        gradeId: entry.gradeId,
                        sectionId: entry.sectionId,
                        subject: entry.subject,
                        currentTopic: entry.currentTopic || 'Class Context',
                        nextTopic: entry.nextTopic || '',
                        completionStatus: entry.status || 'partial',
                        lastSummary: entry.summary || '',
                        lastUpdatedByName: entry.teacherName || 'Teacher',
                        lastUpdatedBy: entry.teacherId || '',
                        updatedAt: entry.timestamp,
                        openLoops: entry.openLoops || (entry.confusionNotes ? [{ id: '1', type: 'confusion', note: entry.confusionNotes, studentTags: [] }] : []),
                        absenceImpact: entry.absenceImpact || []
                    });
                }
            });

            setContexts(Array.from(contextMap.values()));
            setLoading(false);
        };

        const unsubscribeStates = onSnapshot(statesRef, (snapshot: any) => {
            statesDocs = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            updateMergedContexts();
        }, (error: any) => {
            setLoading(false);
        });

        const unsubscribeEntries = onSnapshot(entriesRef, (snapshot: any) => {
            entriesDocs = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            updateMergedContexts();
        }, (error: any) => {
            // Non-blocking
        });

        return () => {
            unsubscribeStates();
            unsubscribeEntries();
        };
    }, [selectedSection, schoolId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showPinPrompt) return;
            if (e.key >= '0' && e.key <= '9') {
                handleKeypadPress(Number(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleKeypadPress('Del');
            } else if (e.key === 'Escape') {
                handleKeypadPress('Cancel');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPinPrompt]);

    const filteredContexts = contexts.filter((c: any) => 
        c.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    if (isCreating || editingContext) {
        return (
            <div className="animate-fade-in">
                <ClassContextEditor 
                    selectedSection={selectedSection} 
                    initialData={editingContext}
                    onCancel={() => {
                        setIsCreating(false);
                        setEditingContext(null);
                    }} 
                    onSuccess={() => {
                        setIsCreating(false);
                        setEditingContext(null);
                    }} 
                />
            </div>
        );
    }



    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-h2 mb-2 flex items-center gap-3">
                        <Activity className="w-6 h-6 text-[var(--accent)]" strokeWidth={1.5} />
                        Class Context
                    </h2>
                    <p className="text-label opacity-70">
                        Subject-wise continuity and open loops for {selectedSection.name}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                        <input 
                            type="text"
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={(e: any) => setSearchTerm(e.target.value)}
                            className="zen-input w-full pl-10 py-2.5 text-small outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        />
                    </div>
                    <button 
                        onClick={() => isUnlocked ? setIsCreating(true) : setShowPinPrompt('create')}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full flex items-center justify-center gap-2 font-medium text-small transition-transform active:scale-95"
                        style={{ background: 'var(--accent)', color: '#FFF' }}
                    >
                        <Plus className="w-4 h-4" />
                        Update Context
                    </button>
                </div>
            </div>

            {/* Grid */}
            {filteredContexts.length === 0 ? (
                <div className="zen-card p-12 text-center border-dashed border-2 border-[var(--glass-border)] opacity-60">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-body font-medium">No Class Contexts updated yet</p>
                    <p className="text-small mt-1 px-4">Teachers use the Genatis Staff mobile app to submit lesson summaries</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContexts.map((context: any) => (
                        <div 
                            key={context.id}
                            onClick={() => setSelectedSubject(context)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedSubject(context);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            className="zen-card-flat p-6 group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            style={{
                                borderTop: `4px solid ${statusColors[context.completionStatus] || 'var(--accent)'}`
                            }}
                        >
                            {/* Glass background effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-h3 font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors">
                                            {context.subject}
                                        </h3>
                                        <div className="flex items-center gap-2 text-small opacity-60">
                                            <User className="w-3 h-3" />
                                            {context.lastUpdatedByName || 'Unknown Teacher'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase" 
                                        style={{ 
                                            background: `${statusColors[context.completionStatus]}20`,
                                            color: statusColors[context.completionStatus]
                                        }}>
                                        {context.completionStatus === 'complete' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                        {context.completionStatus}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1.5">Last Topic</p>
                                        <p className="text-body font-medium flex items-center gap-2">
                                            {context.currentTopic}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-small">
                                        <div className="flex items-center gap-2 opacity-50">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(context.updatedAt?.seconds * 1000).toLocaleDateString()}
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <button 
                                                onClick={(e: any) => {
                                                    e.stopPropagation();
                                                    if (isUnlocked) {
                                                        setEditingContext(context);
                                                    } else {
                                                        setShowPinPrompt(context);
                                                    }
                                                }}
                                                className="p-3 -ml-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all"
                                                title="Edit Context"
                                                aria-label="Edit Context"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <div className="flex items-center gap-1 text-[var(--accent)] font-semibold group-hover:gap-2 transition-all">
                                                Details <ArrowRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedSubject && (
                <DetailedContextCard 
                    context={selectedSubject} 
                    onClose={() => setSelectedSubject(null)} 
                />
            )}

            {showPinPrompt && createPortal(
                <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 animate-fade-in">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                        onClick={() => {
                            setShowPinPrompt(null);
                            setPinInput('');
                            setPinError('');
                        }}
                    />
                    
                    <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--glass-border)] rounded-[32px] shadow-2xl p-8 animate-scale-up">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <Activity className="w-8 h-8" />
                            </div>
                            <h3 className="text-h2 mb-2">Teacher Unlock</h3>
                            <p className="text-small text-[var(--text-secondary)]">
                                Enter PIN to edit context.
                            </p>
                        </div>
                        
                        {/* PIN Display (Circles instead of input box for aesthetics) */}
                        <div className="flex justify-center gap-4 mb-8">
                            {[0, 1, 2, 3].map((i: number) => (
                                <div 
                                    key={i} 
                                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                                        i < pinInput.length 
                                        ? 'bg-[var(--accent)] scale-110 shadow-[0_0_12px_var(--accent)]' 
                                        : 'bg-[var(--glass-border)]'
                                    }`} 
                                />
                            ))}
                        </div>
                        
                        {pinError && (
                            <p className="text-red-500 text-xs mb-4 text-center animate-shake font-bold tracking-wider uppercase">
                                {pinError}
                            </p>
                        )}
                        
                        {/* Scrambled Number Pad */}
                        <div className="grid grid-cols-3 gap-3">
                            {scrambledPad.map((item: any, idx: any) => {
                                const isAction = item === 'Cancel' || item === 'Del';
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleKeypadPress(item)}
                                        aria-label={isAction ? (item === 'Cancel' ? 'Cancel PIN' : 'Delete PIN character') : `PIN digit ${item}`}
                                        className={`h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                                            isAction 
                                            ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]' 
                                            : 'bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                                        }`}
                                    >
                                        {item === 'Cancel' ? <X size={24} /> : item === 'Del' ? <Delete size={24} /> : item}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ClassContextDashboard;



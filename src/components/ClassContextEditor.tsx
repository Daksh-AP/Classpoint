import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { ArrowLeft, Save, Loader2, ChevronDown } from 'lucide-react';
import { SCHOOL_SUBJECTS } from '../utils/SchoolData';
import toast from 'react-hot-toast';
import { AnimatedSelect } from './AnimatedSelect';
import { useSchoolId } from '../hooks/useSchoolId';

const ClassContextEditor = ({ selectedSection, initialData, onCancel, onSuccess }: any) => {
    const [loading, setLoading] = useState(false);
    const schoolId = useSchoolId();
    const [formData, setFormData] = useState({
        subject: initialData?.subject || '',
        currentTopic: initialData?.currentTopic || '',
        nextTopic: initialData?.nextTopic || '',
        completionStatus: initialData?.completionStatus || 'complete',
        summary: initialData?.lastSummary || '',
        confusionNotes: '' 
    });
    const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [customSubject, setCustomSubject] = useState('');

    React.useEffect(() => {
        if (!selectedSection) return;
        const gradeNum = typeof selectedSection.grade === 'string' ? Number(selectedSection.grade.replace(/\D/g, "")) : selectedSection.grade;
        const subjectList = SCHOOL_SUBJECTS[gradeNum as keyof typeof SCHOOL_SUBJECTS] || [];
        setAvailableSubjects(subjectList);
        
        if (initialData?.subject) {
            if (!subjectList.includes(initialData.subject)) {
                setIsCustomSubject(true);
                setCustomSubject(initialData.subject);
            }
        } else if (subjectList.length > 0 && !formData.subject) {
            setFormData((prev: any) => ({ ...prev, subject: subjectList[0] }));
        }
    }, [selectedSection, initialData]);

    const handleChange = (e: any) => {
        setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const finalSubject = isCustomSubject ? customSubject : formData.subject;
        if (!selectedSection || !finalSubject || !formData.currentTopic) return;
        
        setLoading(true);
        try {
            const user = auth.currentUser;
            const teacherUid = user ? user.uid : 'system';
            const teacherName = user ? user.displayName || 'Teacher' : 'Teacher';
            
            const gradeNum = String(selectedSection.grade || '').replace(/\D/g, '') || '9';
            const cleanSecId = String(selectedSection.id || '').replace(/^grade\d+[-_]?/i, '').toLowerCase();

            // 1. Create Lesson Entry Log
            const lessonData = {
                gradeId: gradeNum,
                grade: String(selectedSection.grade),
                sectionId: selectedSection.id,
                cleanSectionId: cleanSecId,
                sectionName: selectedSection.name || selectedSection.id,
                subject: finalSubject,
                currentTopic: formData.currentTopic,
                nextTopic: formData.nextTopic,
                status: formData.completionStatus,
                summary: formData.summary,
                confusionNotes: formData.confusionNotes,
                teacherId: teacherUid,
                teacherName: teacherName,
                timestamp: serverTimestamp(),
                deleted: false
            };
            
            const lessonEntryPath = `schools/${schoolId}/lessonEntries`;
            await addDoc(collection(db, lessonEntryPath), lessonData);

            // 2. Update Subject State Dashboard Card
            // If editing an existing doc, preserve its doc ID (e.g. 9_whiz1_Math from mobile)
            const contextId = initialData?.id || `${gradeNum}_${cleanSecId}_${finalSubject.replace(/\s+/g, '_')}`;
            const contextRef = doc(db, `schools/${schoolId}/subjectStates`, contextId);
            const contextSnap = await getDoc(contextRef);
            
            const contextUpdate = {
                gradeId: gradeNum,
                grade: String(selectedSection.grade),
                sectionId: selectedSection.id,
                cleanSectionId: cleanSecId,
                sectionName: selectedSection.name || selectedSection.id,
                subject: finalSubject,
                currentTopic: formData.currentTopic,
                nextTopic: formData.nextTopic,
                completionStatus: formData.completionStatus,
                lastSummary: formData.summary,
                lastUpdatedBy: teacherUid,
                lastUpdatedByName: teacherName,
                updatedAt: serverTimestamp(),
            };

            if (formData.confusionNotes) {
                const newLoop = {
                    id: crypto.randomUUID(),
                    type: 'confusion',
                    note: formData.confusionNotes,
                    studentTags: []
                };
                
                if (contextSnap.exists()) {
                    await updateDoc(contextRef, {
                        ...contextUpdate,
                        openLoops: arrayUnion(newLoop)
                    });
                } else {
                    await setDoc(contextRef, {
                        ...contextUpdate,
                        openLoops: [newLoop],
                        absenceImpact: []
                    });
                }
            } else {
                if (contextSnap.exists()) {
                    await updateDoc(contextRef, contextUpdate);
                } else {
                    await setDoc(contextRef, {
                        ...contextUpdate,
                        openLoops: [],
                        absenceImpact: []
                    });
                }
            }

            setLoading(false);
            onSuccess();
        } catch (err: any) {
// /* console.error */ ("Failed to submit class context:", err);
// /* console.error */ ('Auth user on class context save:', auth.currentUser);
            setLoading(false);
            const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
            toast.error(`Failed to save update: ${message}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto zen-card p-8 animate-fade-in border border-[var(--glass-border)]">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onCancel}
                    className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-h2">Quick Update</h2>
                    <p className="text-label opacity-70">Log your progress to keep other teachers in the loop.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Subject</label>
                        {isCustomSubject ? (
                            <div className="relative">
                                <input 
                                    required
                                    type="text"
                                    value={customSubject}
                                    onChange={(e: any) => setCustomSubject(e.target.value)}
                                    className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] text-body outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                    placeholder="Enter custom subject..."
                                />
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsCustomSubject(false);
                                        setFormData((prev: any) => ({ ...prev, subject: availableSubjects[0] || '' }));
                                    }}
                                    className="text-[11px] font-medium text-[var(--accent)] hover:underline absolute right-4 top-1/2 -translate-y-1/2"
                                >
                                    List
                                </button>
                            </div>
                        ) : availableSubjects.length > 0 ? (
                            <div className="relative">
                                <AnimatedSelect
                                    value={formData.subject}
                                    onChange={(val: any) => {
                                        if (val === 'custom') {
                                            setIsCustomSubject(true);
                                            setFormData((prev: any) => ({ ...prev, subject: '' }));
                                        } else {
                                            setFormData((prev: any) => ({ ...prev, subject: val }));
                                        }
                                    }}
                                    options={[
                                        ...availableSubjects.map((sub: any) => ({ value: sub, label: sub })),
                                        ...(selectedSection?.grade >= 9 ? [{ value: 'custom', label: 'Custom Subject...' }] : [])
                                    ]}
                                    placeholder="Select subject..."
                                />
                            </div>
                        ) : (
                            <input 
                                required
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder="e.g. Mathematics"
                                className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] text-body outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                        )}
                    </div>
                    <div className="relative">
                        <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Status</label>
                        <AnimatedSelect
                            value={formData.completionStatus}
                            onChange={(val: any) => setFormData((prev: any) => ({ ...prev, completionStatus: val }))}
                            options={[
                                { value: 'complete', label: 'Complete' },
                                { value: 'partial', label: 'Partial' },
                                { value: 'incomplete', label: 'Incomplete' }
                            ]}
                            placeholder="Select status..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Current Topic Taught</label>
                        <input 
                            required
                            name="currentTopic"
                            value={formData.currentTopic}
                            onChange={handleChange}
                            placeholder="e.g. Fractions Addition"
                            className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] text-body outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Next Topic (Optional)</label>
                        <input 
                            name="nextTopic"
                            value={formData.nextTopic}
                            onChange={handleChange}
                            placeholder="e.g. Fractions Multiplication"
                            className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] text-body outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Lesson Summary (Optional)</label>
                    <textarea 
                        name="summary"
                        value={formData.summary}
                        onChange={handleChange}
                        placeholder="Briefly describe what was covered..."
                        className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] text-body min-h-[100px] resize-y outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                </div>

                <div>
                    <label className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2 block text-[var(--warning, #FF9F0A)]">Open Confusions (Optional)</label>
                    <textarea 
                        name="confusionNotes"
                        value={formData.confusionNotes}
                        onChange={handleChange}
                        placeholder="Any concepts students struggled with?"
                        className="zen-input w-full px-4 py-3 rounded-xl border border-[var(--warning, #FF9F0A)] bg-[var(--surface)] text-body min-h-[80px] resize-y outline-none focus:ring-1 focus:ring-[var(--warning, #FF9F0A)]"
                    />
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#FFF' }}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {loading ? 'Saving Update...' : 'Submit Update'}
                </button>
            </form>
        </div>
    );
};

export default ClassContextEditor;

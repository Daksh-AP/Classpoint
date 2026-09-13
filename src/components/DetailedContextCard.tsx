import React from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    BookOpen, 
    User, 
    Clock, 
    AlertCircle, 
    History, 
    CornerRightDown, 
    Users,
    ChevronRight,
    CircleDashed,
    CircleDot,
    CheckCircle2
} from 'lucide-react';

const statusColors: any= {
    complete: '#30D158',
    partial: '#FF9F0A',
    incomplete: '#FF453A'
};

const DetailedContextCard = ({ context, onClose }: any) => {
    if (!context) return null;

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 animate-fade-in">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                onClick={onClose}
            />

            {/* Card Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--surface)] border border-[var(--glass-border)] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-scale-up backdrop-blur-2xl">
                
                {/* Header Section */}
                <div className="p-8 pb-6 border-b border-[var(--glass-border)] flex justify-between items-start bg-[var(--surface)]">
                    <div className="flex gap-6">
                        <div 
                            className="w-20 h-20 rounded-3xl flex items-center justify-center border"
                            style={{ 
                                background: `${statusColors[context.completionStatus]}10`,
                                borderColor: `${statusColors[context.completionStatus]}30`,
                                color: statusColors[context.completionStatus]
                            }}
                        >
                            <BookOpen size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-h1">{context.subject}</h1>
                                <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                                    style={{ 
                                        background: `${statusColors[context.completionStatus]}20`,
                                        color: statusColors[context.completionStatus]
                                    }}>
                                    {context.completionStatus}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-body opacity-60">
                                <div className="flex items-center gap-1.5">
                                    <User size={16} />
                                    <span>{context.lastUpdatedByName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={16} />
                                    <span>Updated {new Date(context.updatedAt?.seconds * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] rounded-2xl transition-colors"
                    >
                        <X size={24} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        
                        {/* Main Info (Left) */}
                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="zen-card-flat p-6 border-l-4 border-[var(--accent)]">
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-50">Current Topic</p>
                                <p className="text-h3">{context.currentTopic}</p>
                            </div>
                            <div className="zen-card-flat p-6 border-l-4 border-[var(--text-secondary)] opacity-80">
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-50">Next Topic</p>
                                <p className="text-h3">{context.nextTopic || 'TBD'}</p>
                            </div>
                        </div>

                        {/* Detail Panels */}
                        <div className="lg:col-span-7 space-y-8">
                            {/* Summary */}
                            <section>
                                <h3 className="text-h3 flex items-center gap-2 mb-4">
                                    <History className="w-5 h-5 text-[var(--accent)]" />
                                    Last Lesson Summary
                                </h3>
                                <div className="zen-card-flat p-6 leading-relaxed text-body opacity-90">
                                    {context.lastSummary}
                                </div>
                            </section>

                            {/* Open Loops */}
                            <section>
                                <h3 className="text-h3 flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    Open Loops & Confusions
                                </h3>
                                <div className="space-y-4">
                                    {context.openLoops && context.openLoops.length > 0 ? (
                                        context.openLoops.map((loop: any) => (
                                            <div key={loop.id} className="flex gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                                                <div className="mt-1">
                                                    {loop.type === 'confusion' ? <CircleDashed size={16} className="text-red-500" /> : <CircleDot size={16} className="text-amber-500" />}
                                                </div>
                                                <p className="text-body opacity-80">{loop.note}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-small opacity-50 py-4 italic">No open loops recorded for this subject.</div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar (Right) */}
                        <div className="lg:col-span-5 space-y-8">
                            <section>
                                <h3 className="text-h3 flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-[var(--accent)]" />
                                    Absence Impact
                                </h3>
                                <div className="zen-card p-6 overflow-hidden">
                                    <p className="text-small mb-6 opacity-60 leading-snug">
                                        Students who missed the key concept on {new Date(context.updatedAt?.seconds * 1000).toLocaleDateString()}:
                                    </p>
                                    <div className="space-y-3">
                                        {context.absenceImpact && context.absenceImpact.length > 0 ? (
                                            context.absenceImpact.map((impact: any, idx: any) => (
                                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-bold text-[10px]">
                                                            {impact.studentName.charAt(0)}
                                                        </div>
                                                        <span className="text-small font-medium">{impact.studentName}</span>
                                                    </div>
                                                    <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                                        style={{ 
                                                            background: impact.severity === 'high' ? '#FF453A20' : '#FF9F0A20',
                                                            color: impact.severity === 'high' ? '#FF453A' : '#FF9F0A'
                                                        }}>
                                                        {impact.severity}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6">
                                                <CheckCircle2 size={32} className="mx-auto mb-2 text-[#30D158] opacity-20" />
                                                <p className="text-small opacity-50">No absence impact identified.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-6 bg-[var(--glass-bg)] border-t border-[var(--glass-border)] text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                        Genatis Continuity Intelligence Layer
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DetailedContextCard;



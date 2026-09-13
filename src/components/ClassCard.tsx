import React, { memo, useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, ArrowRight, User, Info } from 'lucide-react';
import { TimeService } from '../services/TimeService';
import { getSetRotationNotice } from '../utils/timetableNormalizer';

const ClassCard = memo(({ classData, type = 'current' }: any) => {
    const isCurrent = type === 'current';
    const Icon = isCurrent ? Clock : ArrowRight;
    const title = isCurrent ? 'Current Class' : 'Next Class';

    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isCurrent || !classData) return;

        const calculateProgress = () => {
            const now = new Date();
            const currentMinutes = TimeService.timeToMinutes(TimeService.formatTime(now));
            const startMinutes = TimeService.timeToMinutes(classData.startTime);
            const endMinutes = TimeService.timeToMinutes(classData.endTime);

            const totalDuration = endMinutes - startMinutes;
            const elapsed = currentMinutes - startMinutes;

            if (totalDuration <= 0) return 0;
            const percentage = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
            setProgress(percentage);
        };

        calculateProgress();
        const interval = setInterval(calculateProgress, 60000);
        return () => clearInterval(interval);
    }, [isCurrent, classData]);

    if (!classData) {
        return (
            <div className="zen-card p-6 flex flex-col justify-center min-h-[180px]">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 opacity-40" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
                    <h3 className="text-label">{title}</h3>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 mt-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--surface)' }}
                    >
                        <Calendar className="w-5 h-5" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} strokeWidth={1.5} />
                    </div>
                    <p className="text-small">
                        {isCurrent ? 'No class scheduled' : 'No upcoming classes'}
                    </p>
                </div>
            </div>
        );
    }

    const circleRadius = 24;
    const circumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            className="zen-card relative overflow-hidden transition-all"
            style={{
                borderLeft: isCurrent ? '3px solid var(--accent)' : '3px solid var(--glass-border)',
            }}
        >
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-label mb-1">{title}</h3>
                        <p className="text-h2 tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {classData.subject}
                        </p>

                        <div className="flex flex-wrap items-center mt-3 gap-4">
                            <div className="flex items-center text-small gap-1.5">
                                <Clock className="w-4 h-4 opacity-60" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ fontFamily: 'monospace' }}>{classData.startTime} – {classData.endTime}</span>
                            </div>
                            {classData.teacher && (
                                <div className="flex items-center text-small gap-1.5">
                                    <User className="w-4 h-4 opacity-60" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                                    <span>{classData.teacher}</span>
                                </div>
                            )}
                            <div className="flex items-center text-small gap-1.5">
                                <MapPin className="w-4 h-4 opacity-60" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                                <span>{classData.location || 'Classroom'}</span>
                            </div>
                        </div>
                    </div>

                    {isCurrent ? (
                        <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="32" cy="32" r={circleRadius}
                                    stroke="var(--glass-border)" strokeWidth="3" fill="none"
                                />
                                <circle
                                    cx="32" cy="32" r={circleRadius}
                                    stroke="var(--accent)" strokeWidth="3" fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{Math.round(progress)}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-label mb-1">Starts In</span>
                            <span
                                className="px-3 py-1.5 rounded-lg text-small font-medium"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {TimeService.getTimeUntil(classData.startTime)}
                            </span>
                        </div>
                    )}
                </div>

                {(classData.setNotice || getSetRotationNotice(classData.subject)) && (
                    <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs animate-fade-in">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <span>{classData.subject} Activity & Rotation Notice:</span>
                        </div>
                        <p className="text-[var(--text-secondary)] leading-relaxed pl-5">
                            {classData.setNotice || getSetRotationNotice(classData.subject)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}, (prevProps: any, nextProps: any) => {
    return prevProps.classData?.subject === nextProps.classData?.subject &&
        prevProps.classData?.startTime === nextProps.classData?.startTime &&
        prevProps.classData?.endTime === nextProps.classData?.endTime &&
        prevProps.type === nextProps.type;
});

ClassCard.displayName = 'ClassCard';

export default ClassCard;

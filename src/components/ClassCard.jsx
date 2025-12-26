import React, { memo } from 'react';
import { Clock, Calendar, MapPin, RefreshCw } from 'lucide-react';
import { TimeService } from '../services/TimeService.js';

const ClassCard = memo(({ classData, type = 'current' }) => {
    const isCurrent = type === 'current';
    const Icon = isCurrent ? Clock : RefreshCw;
    const iconColor = isCurrent ? 'primary' : 'accent';
    const title = isCurrent ? 'Current Class' : 'Next Class';
    const badge = isCurrent ? 'Live Now' : 'Up Next';

    if (!classData) {
        return (
            <div className={`glass-card p-6 relative overflow-hidden group hover:border-${iconColor}-500/30 transition-colors`}>
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                    <Icon className={`w-24 h-24 text-${iconColor}-400`} />
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                        <div className={`p-2 rounded-lg bg-${iconColor}-500/20 mr-3`}>
                            <Icon className={`w-5 h-5 text-${iconColor}-400`} />
                        </div>
                        {title}
                    </h3>
                </div>

                <div className="text-center py-10 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 font-medium">
                        {isCurrent ? 'No class currently scheduled' : 'No upcoming classes today'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-card p-6 relative overflow-hidden group hover:border-${iconColor}-500/30 transition-colors`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon className={`w-24 h-24 text-${iconColor}-400`} />
            </div>

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                    <div className={`p-2 rounded-lg bg-${iconColor}-500/20 mr-3`}>
                        <Icon className={`w-5 h-5 text-${iconColor}-400`} />
                    </div>
                    {title}
                </h3>
                <span className={`px-3 py-1 bg-${iconColor}-500/20 border border-${iconColor}-500/30 text-${iconColor}-300 text-xs font-bold uppercase tracking-wider rounded-full ${isCurrent ? 'animate-pulse-slow' : ''}`}>
                    {badge}
                </span>
            </div>

            <div className="space-y-4 relative z-10">
                <div>
                    <p className="text-3xl font-bold text-white tracking-tight">{classData.subject}</p>
                    <p className="text-slate-400 flex items-center mt-2 text-sm font-medium">
                        <MapPin className={`w-4 h-4 mr-2 text-${iconColor}-400`} />
                        {classData.location || 'Classroom'}
                    </p>
                </div>
                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5">
                    <span className="text-slate-400 font-mono">
                        {classData.startTime} - {classData.endTime}
                    </span>
                    <span className={`text-${iconColor}-300 font-medium bg-${iconColor}-500/10 px-3 py-1 rounded-full`}>
                        {isCurrent
                            ? `${TimeService.getTimeRemaining(classData.endTime)} remaining`
                            : `in ${TimeService.getTimeUntil(classData.startTime)}`
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function - only re-render if class data actually changed
    return prevProps.classData?.subject === nextProps.classData?.subject &&
        prevProps.classData?.startTime === nextProps.classData?.startTime &&
        prevProps.classData?.endTime === nextProps.classData?.endTime &&
        prevProps.type === nextProps.type;
});

ClassCard.displayName = 'ClassCard';

export default ClassCard;

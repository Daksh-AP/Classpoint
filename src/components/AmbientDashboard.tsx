import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Bell } from 'lucide-react';
import { TimeService } from '../services/TimeService';

const AmbientDashboard = ({ selectedSection, timetableData, onResume, isOffline }: any) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    // Determine what's next
    const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const todaySlots = timetableData?.[currentDay] || [];
    
    let nextClass = null;
    if (todaySlots.length > 0) {
        // Find next class based on time
        const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const futureClasses = todaySlots.filter((slot: any) => {
            const startStr = slot.startTime; // e.g. "09:00 AM"
            const parsedStart = TimeService.parseTime(startStr);
            if (!parsedStart) return false;
            return (parsedStart.getHours() * 60 + parsedStart.getMinutes()) >= nowMinutes;
        });

        // sort by start time
        futureClasses.sort((a: any, b: any) => {
            return TimeService.parseTime(a.startTime).getTime() - TimeService.parseTime(b.startTime).getTime();
        });

        if (futureClasses.length > 0) {
            nextClass = futureClasses[0];
        }
    }

    // Floating particles config
    const particles = Array.from({ length: 5 }).map((_: any, i: number) => ({
        id: i,
        size: Math.random() * 300 + 200,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 20,
        delay: Math.random() * 5
    }));

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden cursor-pointer touch-none"
            style={{ backgroundColor: 'var(--bg)' }}
            onClick={onResume}
            onTouchStart={onResume}
        >
            {/* Ambient Background Glows */}
            {particles.map((p: any) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: p.size,
                        height: p.size,
                        background: isOffline ? '#F59E0B' : 'var(--accent-soft)',
                        filter: 'blur(80px)',
                        opacity: isOffline ? 0.4 : 0.6,
                    }}
                    animate={{
                        x: [`${p.x}vw`, `${(p.x + 30) % 100}vw`, `${p.x}vw`],
                        y: [`${p.y}vh`, `${(p.y + 30) % 100}vh`, `${p.y}vh`],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: p.delay
                    }}
                />
            ))}

            {isOffline && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-12 px-6 py-2 rounded-full font-bold tracking-widest uppercase text-sm"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                >
                    System Offline • Running Locally
                </motion.div>
            )}

            {/* Central Clock Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 1 }}
                >
                    <h1 className="text-[12rem] leading-none font-light tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                        {timeString.replace(/ AM| PM/i, '')}
                    </h1>
                    <div className="text-[2rem] font-medium tracking-wide uppercase mt-[-1rem] mb-12" style={{ color: 'var(--accent)' }}>
                        {dateString}
                    </div>
                </motion.div>

                {/* Info Bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="zen-card px-10 py-6 flex items-center gap-12"
                    style={{ borderRadius: '32px' }}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                            <Calendar size={32} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Current Section</div>
                            <div className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                                {selectedSection ? selectedSection.name : 'No section selected'}
                            </div>
                        </div>
                    </div>

                    <div className="w-[1px] h-16" style={{ backgroundColor: 'var(--glass-border)' }}></div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                            <Bell size={32} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Next Up</div>
                            <div className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                                {nextClass ? `${nextClass.subject} • ${nextClass.startTime}` : 'Free Period'}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Resume Hint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-12 text-lg tracking-widest uppercase"
                style={{ color: 'var(--text-secondary)' }}
            >
                Tap anywhere to resume
            </motion.div>
        </motion.div>
    );
};

export default AmbientDashboard;

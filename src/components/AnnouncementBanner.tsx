import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useSchoolId } from '../hooks/useSchoolId';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const AnnouncementBanner = ({ classId }: any) => {
    const schoolId = useSchoolId();
    const [visibleAnnouncement, setVisibleAnnouncement] = useState<any | null>(null);

    useEffect(() => {
        if (!classId) return;

        const q = query(
            collection(db, 'schools', schoolId, 'announcements'),
            where('target.type', '==', 'class'),
            where('target.ids', 'array-contains', classId)
        );

        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            snapshot.docChanges().forEach((change: any) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const now = new Date();
                    // Handle both Firestore Timestamp and ISO Strings
                    const createdAt = data.createdAt?.toDate
                        ? data.createdAt.toDate()
                        : (data.createdAt ? new Date(data.createdAt) : null);

                    // Only show announcements created in the last 5 minutes
                    if (createdAt && now.getTime() - createdAt.getTime() < 5 * 60 * 1000) {
                        setVisibleAnnouncement({ id: change.doc.id, ...data });

                        // Play notification sound safely
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(() => {});
                    }
                }
            });
        }, () => {
        });

        return () => unsubscribe();
    }, [classId, schoolId]);

    // Auto-dismiss after 15 seconds
    useEffect(() => {
        let timer: any;
        if (visibleAnnouncement) {
            timer = setTimeout(() => {
                setVisibleAnnouncement(null);
            }, 15000);
        }
        return () => clearTimeout(timer);
    }, [visibleAnnouncement]);

    return (
        <AnimatePresence>
            {visibleAnnouncement && (
                <motion.div
                    key="announcement-overlay"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 overflow-hidden"
                    style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                >
                    {/* Subtle ambient background glow */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: 0.4, duration: 1.5 }}
                        className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 pointer-events-none" 
                    />

                    {/* Dismiss Button */}
                    <button
                        onClick={() => setVisibleAnnouncement(null)}
                        className="absolute top-8 right-8 p-4 rounded-full transition-all opacity-60 hover:opacity-100 hover:scale-105"
                        style={{ color: 'var(--text-primary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Content Container */}
                    <motion.div 
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center max-w-5xl text-center z-10 w-full"
                    >
                        <div 
                            className="p-6 rounded-[32px] mb-8 shadow-2xl flex items-center justify-center"
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                        >
                            <Bell className="w-16 h-16 opacity-90 animate-pulse" style={{ color: 'var(--accent)' }} />
                        </div>

                        <h1 
                            className="text-5xl md:text-7xl font-bold tracking-tight mb-6" 
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Announcement
                        </h1>

                        {visibleAnnouncement.senderName && (
                            <div 
                                className="mb-12 inline-flex items-center px-6 py-2 rounded-full shadow-sm" 
                                style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
                            >
                                <span 
                                    className="text-sm md:text-base font-semibold tracking-widest uppercase" 
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Broadcasted by {visibleAnnouncement.senderName}
                                </span>
                            </div>
                        )}

                        <div 
                            className="w-full max-w-4xl p-8 md:p-12 rounded-[32px] shadow-xl"
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                        >
                            <p 
                                className="text-2xl md:text-4xl leading-relaxed whitespace-pre-wrap font-medium" 
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {visibleAnnouncement.content}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AnnouncementBanner;

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const AnnouncementBanner = ({ classId }) => {
    const [visibleAnnouncement, setVisibleAnnouncement] = useState(null);

    useEffect(() => {
        if (!classId) return;

        const q = query(
            collection(db, 'announcements'),
            where('target.type', '==', 'class'),
            where('target.ids', 'array-contains', classId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const now = new Date();
                    const createdAt = data.createdAt?.toDate();

                    // Only show announcements created in the last 5 minutes
                    if (createdAt && now.getTime() - createdAt.getTime() < 5 * 60 * 1000) {
                        setVisibleAnnouncement({ id: change.doc.id, ...data });

                        // Play notification sound safely
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(e => console.log('Audio playback prevented', e));
                    }
                }
            });
        }, (error) => {
            console.error("Error listening to announcements:", error);
        });

        return () => unsubscribe();
    }, [classId]);

    // Auto-dismiss after 15 seconds
    useEffect(() => {
        let timer;
        if (visibleAnnouncement) {
            timer = setTimeout(() => {
                setVisibleAnnouncement(null);
            }, 15000);
        }
        return () => clearTimeout(timer);
    }, [visibleAnnouncement]);

    if (!visibleAnnouncement) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-2xl w-full mx-4"
            >
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none" />

                    <button
                        onClick={() => setVisibleAnnouncement(null)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="bg-blue-500/20 p-3 rounded-full border border-blue-500/30">
                            <Bell className="w-6 h-6 text-blue-400 animate-pulse" />
                        </div>
                        <div className="pr-8">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-semibold text-white">Announcement</h3>
                                {visibleAnnouncement.senderName && (
                                    <span className="text-sm text-slate-400">• From {visibleAnnouncement.senderName}</span>
                                )}
                            </div>
                            <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {visibleAnnouncement.content}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AnnouncementBanner;

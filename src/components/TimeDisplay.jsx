import React, { useState, useEffect, memo } from 'react';

const TimeDisplay = memo(() => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="text-right hidden md:block">
            <p className="text-lg font-bold text-white font-mono tracking-wider">{formatTime(currentTime)}</p>
            <p className="text-xs text-slate-400 uppercase tracking-widest">{formatDate(currentTime)}</p>
        </div>
    );
});

TimeDisplay.displayName = 'TimeDisplay';

export default TimeDisplay;

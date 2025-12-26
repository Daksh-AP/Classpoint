import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Clock, Bell } from 'lucide-react';

const Timer = ({ onClose }) => {
    // Default to 15 minutes
    const [duration, setDuration] = useState(15 * 60);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Audio ref (using a simple beep for now, or we can try to load the chime)
    // Ideally this would be passed as a prop or imported

    useEffect(() => {
        let interval = null;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        setIsFinished(true);
                        setIsActive(false);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            setIsFinished(true);
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => {
        if (isFinished) {
            resetTimer();
        } else {
            setIsActive(!isActive);
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setIsFinished(false);
        setTimeLeft(duration);
    };

    const setPreset = (minutes) => {
        const seconds = minutes * 60;
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(false);
        setIsFinished(false);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate progress for circle (inverted: starts full, goes to empty)
    const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
    const circumference = 2 * Math.PI * 120; // Radius 120
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in text-white">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all text-gray-300 hover:text-white"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="flex flex-col items-center w-full max-w-4xl px-4">

                {/* Main Timer Display */}
                <div className="relative mb-12">
                    {/* Progress Ring */}
                    <svg className="transform -rotate-90 w-80 h-80 md:w-96 md:h-96">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-white/10"
                        />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className={`transition-all duration-1000 ease-linear ${isFinished ? 'text-red-500' :
                                timeLeft < 60 ? 'text-red-400' :
                                    isActive ? 'text-primary-400' : 'text-blue-400'
                                }`}
                        />
                    </svg>

                    {/* Digital Time */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`font-mono font-bold text-6xl md:text-8xl tracking-widest ${isFinished ? 'text-red-500 animate-pulse' : 'text-white'
                            }`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-6 mb-12">
                    <button
                        onClick={resetTimer}
                        className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                        title="Reset"
                    >
                        <RotateCcw className="w-8 h-8 text-gray-300" />
                    </button>

                    <button
                        onClick={toggleTimer}
                        className={`p-8 rounded-full transition-all active:scale-95 shadow-2xl flex items-center justify-center ${isActive
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 ring-2 ring-yellow-500/50'
                            : isFinished
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-2 ring-red-500/50'
                                : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-600/50'
                            }`}
                    >
                        {isActive ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
                    </button>

                    <div className="w-16"></div> {/* Spacer for symmetry */}
                </div>

                {/* Presets */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 w-full max-w-2xl">
                    {[5, 10, 15, 30, 45, 60].map((min) => (
                        <button
                            key={min}
                            onClick={() => setPreset(min)}
                            className={`py-3 px-4 rounded-xl font-medium transition-all ${duration === min * 60
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {min} min
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default Timer;

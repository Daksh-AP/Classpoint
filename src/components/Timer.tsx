import React, { useState } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { useTimer } from '../contexts/TimerContext';

const Timer = ({ onClose }: any) => {
    const {
        duration,
        timeLeft,
        isActive,
        isFinished,
        toggleTimer,
        resetTimer,
        setPreset
    } = useTimer();

    const [showCustom, setShowCustom] = useState(false);
    const [customMin, setCustomMin] = useState('');
    const [customSec, setCustomSec] = useState('');

    const formatTime = (seconds: any) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
    const circumference = 2 * Math.PI * 140;
    const strokeDashoffset = Math.max(0, circumference - (progress / 100) * circumference);

    const isCustomDuration = ![5, 10, 15, 30, 45, 60].includes(duration / 60);

    const handleCustomSet = () => {
        const mins = parseInt(customMin) || 0;
        const secs = parseInt(customSec) || 0;
        const totalSeconds = mins * 60 + secs;
        if (totalSeconds > 0) {
            // Use setPreset's approach but with raw seconds
            setPreset(totalSeconds / 60);
            setShowCustom(false);
            setCustomMin('');
            setCustomSec('');
        }
    };

    const accentColor = 'var(--accent)';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-8 right-8 p-4 rounded-full transition-all active:scale-95"
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)',
                }}
            >
                <X className="w-7 h-7" strokeWidth={1.5} />
            </button>

            <div className="flex flex-col items-center w-full max-w-4xl">
                {/* Timer Ring */}
                <div className="relative mb-16 select-none">
                    <svg className="transform -rotate-90 w-[340px] h-[340px] md:w-[420px] md:h-[420px]">
                        <circle
                            cx="50%" cy="50%" r="140"
                            stroke="var(--glass-border)"
                            strokeWidth="3"
                            fill="transparent"
                        />
                        <circle
                            cx="50%" cy="50%" r="140"
                            stroke={isFinished ? '#DC3C3C' : timeLeft < 60 ? '#C9A27E' : isActive ? 'var(--accent)' : 'var(--glass-border)'}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                            style={{ filter: isActive ? 'drop-shadow(0 0 12px rgba(201, 162, 126, 0.3))' : 'none' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span
                            className={`text-7xl md:text-[110px] font-light tracking-tight ${isFinished ? 'animate-pulse' : ''}`}
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontVariantNumeric: 'tabular-nums',
                                color: isFinished ? '#DC3C3C' : 'var(--text-primary)',
                            }}
                        >
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-16">
                    <button
                        onClick={resetTimer}
                        className="p-5 rounded-full transition-all active:scale-90"
                        title="Reset"
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <RotateCcw className="w-8 h-8" strokeWidth={1.5} />
                    </button>

                    <button
                        onClick={toggleTimer}
                        className="p-8 rounded-full transition-all active:scale-95 flex items-center justify-center"
                        style={{
                            background: isActive
                                ? 'rgba(201, 162, 126, 0.15)'
                                : isFinished
                                    ? 'rgba(220, 60, 60, 0.15)'
                                    : 'var(--accent)',
                            color: isActive
                                ? 'var(--accent)'
                                : isFinished
                                    ? '#DC3C3C'
                                    : '#FFFFFF',
                            border: `1px solid ${isActive ? 'rgba(201, 162, 126, 0.3)' : isFinished ? 'rgba(220, 60, 60, 0.3)' : 'var(--accent)'}`,
                            boxShadow: !isActive && !isFinished ? '0 0 30px rgba(201, 162, 126, 0.3)' : 'none',
                        }}
                    >
                        {isActive
                            ? <Pause className="w-10 h-10 fill-current" strokeWidth={1} />
                            : <Play className="w-10 h-10 fill-current ml-2" strokeWidth={1} />
                        }
                    </button>

                    <div className="w-[74px]"></div>
                </div>

                {/* Preset Pills */}
                <div className="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
                    {[5, 10, 15, 30, 45, 60].map((min: any) => (
                        <button
                            key={min}
                            onClick={() => { setPreset(min); setShowCustom(false); }}
                            className="py-3 px-6 rounded-full font-medium transition-all"
                            style={{
                                background: duration === min * 60 ? 'var(--accent)' : 'var(--surface)',
                                color: duration === min * 60 ? '#FFFFFF' : 'var(--text-secondary)',
                                border: `1px solid ${duration === min * 60 ? 'var(--accent)' : 'var(--glass-border)'}`,
                                boxShadow: duration === min * 60 ? '0 0 15px rgba(201, 162, 126, 0.25)' : 'none',
                                transitionDuration: 'var(--motion-medium)',
                            }}
                        >
                            {min}m
                        </button>
                    ))}
                    {/* Custom button */}
                    <button
                        onClick={() => setShowCustom(!showCustom)}
                        className="py-3 px-6 rounded-full font-medium transition-all"
                        style={{
                            background: showCustom || isCustomDuration ? 'var(--accent)' : 'var(--surface)',
                            color: showCustom || isCustomDuration ? '#FFFFFF' : 'var(--text-secondary)',
                            border: `1px solid ${showCustom || isCustomDuration ? 'var(--accent)' : 'var(--glass-border)'}`,
                            boxShadow: showCustom || isCustomDuration ? '0 0 15px rgba(201, 162, 126, 0.25)' : 'none',
                            transitionDuration: 'var(--motion-medium)',
                        }}
                    >
                        Custom
                    </button>
                </div>

                {/* Custom Time Input */}
                {showCustom && (
                    <div
                        className="mt-6 flex items-center gap-3 p-4 rounded-2xl animate-slide-up"
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--glass-border)',
                        }}
                    >
                        <input
                            type="number"
                            min="0"
                            max="999"
                            value={customMin}
                            onChange={(e: any) => setCustomMin(e.target.value)}
                            placeholder="0"
                            className="w-16 text-center py-2 rounded-xl font-medium text-lg outline-none"
                            style={{
                                background: 'var(--bg)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                            }}
                            onKeyDown={(e: any) => e.key === 'Enter' && handleCustomSet()}
                        />
                        <span style={{ color: 'var(--text-secondary)' }} className="font-medium text-sm">min</span>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={customSec}
                            onChange={(e: any) => setCustomSec(e.target.value)}
                            placeholder="0"
                            className="w-16 text-center py-2 rounded-xl font-medium text-lg outline-none"
                            style={{
                                background: 'var(--bg)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                            }}
                            onKeyDown={(e: any) => e.key === 'Enter' && handleCustomSet()}
                        />
                        <span style={{ color: 'var(--text-secondary)' }} className="font-medium text-sm">sec</span>
                        <button
                            onClick={handleCustomSet}
                            className="py-2 px-5 rounded-xl font-medium transition-all active:scale-95"
                            style={{
                                background: 'var(--accent)',
                                color: '#FFFFFF',
                                border: '1px solid var(--accent)',
                            }}
                        >
                            Set
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timer;


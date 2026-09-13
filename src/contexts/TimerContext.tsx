import React, { createContext, useState, useEffect, useContext } from 'react';

interface TimerContextType {
    duration: number;
    timeLeft: number;
    isActive: boolean;
    isFinished: boolean;
    toggleTimer: () => void;
    resetTimer: () => void;
    setPreset: (minutes: number) => void;
    setDuration: React.Dispatch<React.SetStateAction<number>>;
    setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
    setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
    setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
    children: React.ReactNode;
}

export const TimerProvider = ({ children }: TimerProviderProps) => {
    const [duration, setDuration] = useState(15 * 60);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        let interval: any

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime: number) => {
                    if (prevTime <= 1) {
                        setIsFinished(true);
                        setIsActive(false);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsFinished(true);
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => {
        if (isFinished) resetTimer();
        else setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setIsFinished(false);
        setTimeLeft(duration);
    };

    const setPreset = (minutes: number) => {
        const seconds = minutes * 60;
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(false);
        setIsFinished(false);
    };

    return (
        <TimerContext.Provider value={{
            duration,
            timeLeft,
            isActive,
            isFinished,
            toggleTimer,
            resetTimer,
            setPreset,
            setDuration,
            setTimeLeft,
            setIsActive,
            setIsFinished
        }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
};

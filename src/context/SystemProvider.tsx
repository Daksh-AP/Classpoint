import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

interface SystemContextType {
    isIdle: boolean;
    isOffline: boolean;
    resetIdleTimer: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }: any) => {
    const [isIdle, setIsIdle] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const idleTimerRef = useRef<any>(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const resetIdleTimer = useCallback(() => {
        if (isIdle) {
            setIsIdle(false);
        }
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
        }, 120000); // 2 minutes
    }, [isIdle]);

    useEffect(() => {
        resetIdleTimer();

        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        const handler = () => resetIdleTimer();
        
        events.forEach((event: any) => {
            window.addEventListener(event, handler, { passive: true });
        });

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach((event: any) => {
                window.removeEventListener(event, handler);
            });
        };
    }, [resetIdleTimer]);

    return (
        <SystemContext.Provider value={{ isIdle, isOffline, resetIdleTimer }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = () => {
    const context = useContext(SystemContext);
    if (context === undefined) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { useUserSettings, useUpdateUserSettings } from '../lib/api/queries';
import { StorageService } from '../services/StorageService';

import { useSchoolId } from '../hooks/useSchoolId';

interface SettingsContextType {
    settings: any
    theme: 'light' | 'dark';
    connectedSmartboardId: string | null;
    handleSettingsChange: (newSettings: any) => Promise<void>;
    handleConnectSmartboard: (boardId: string) => Promise<void>;
    themeOverlay: 'enter' | 'exit' | null;
    overlayTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }: any) => {
    const { currentUser } = useAuth();
    const schoolId = useSchoolId();
    const { data: userSettings } = useUserSettings(currentUser?.uid, schoolId);
    const updateSettingsMutation = useUpdateUserSettings(currentUser?.uid, schoolId);
    
    // We keep local state for rapid UI updates on settings change
    const [localSettings, setLocalSettings] = useState<any>(() => StorageService.getSettings());
    const connectedSmartboardId: string | null = userSettings?.connectedSmartboardId || null;

    useEffect(() => {
        if (userSettings?.settings) {
            setLocalSettings(userSettings.settings);
            StorageService.saveSettings(userSettings.settings);
        }
    }, [userSettings?.settings]);

    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme: 'light' | 'dark' = localSettings.theme === 'dark' 
      ? 'dark' 
      : (localSettings.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : 'light');
    
    // Theme Switch Animation
    const prevThemeRef = useRef(theme);
    const [themeOverlay, setThemeOverlay] = useState<'enter' | 'exit' | null>(null);
    const [overlayTheme, setOverlayTheme] = useState<'light' | 'dark'>(theme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.className = theme === 'dark' ? 'dark' : '';

        if (prevThemeRef.current === theme) return;
        const newTheme = theme;
        prevThemeRef.current = newTheme;

        setOverlayTheme(newTheme);
        setThemeOverlay('enter');

        const exitTimer = setTimeout(() => {
            setThemeOverlay('exit');
        }, 1550);

        const cleanupTimer = setTimeout(() => {
            setThemeOverlay(null);
        }, 1550 + 800);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(cleanupTimer);
        };
    }, [theme]);

    useEffect(() => {
        if (window.electronAPI) {
            try {
                window.electronAPI.send('set-start-on-login', !!localSettings.startOnLogin);
            } catch (err) {
// /* console.warn */ ("IPC Not available for start-on-login", err);
            }
        }
    }, [localSettings.startOnLogin]);

    const handleSettingsChange = useCallback(async (newSettings: any) => {
        setLocalSettings(newSettings);
        StorageService.saveSettings(newSettings);
        if (currentUser?.uid) {
             await updateSettingsMutation.mutateAsync({ settings: newSettings });
        }
    }, [currentUser?.uid, updateSettingsMutation]);

    const handleConnectSmartboard = useCallback(async (boardId: string) => {
        if (currentUser?.uid) {
            await updateSettingsMutation.mutateAsync({ connectedSmartboardId: boardId });
        }
    }, [currentUser?.uid, updateSettingsMutation]);

    const contextValue = useMemo(() => ({
        settings: localSettings,
        theme,
        connectedSmartboardId,
        handleSettingsChange,
        handleConnectSmartboard,
        themeOverlay,
        overlayTheme
    }), [localSettings, theme, connectedSmartboardId, handleSettingsChange, handleConnectSmartboard, themeOverlay, overlayTheme]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

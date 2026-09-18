import { useSchoolId } from '../hooks/useSchoolId';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { useUserSettings, useUpdateUserSettings, useTimetable, useUpdateTimetable } from '../lib/api/queries';

import { resolveAccountSection, Section } from '../utils/sectionUtils';

interface DataContextType {
    selectedSection: any | null;
    isSectionLocked: boolean;
    timetableData: any | null;
    handleSectionSelect: (section: any) => Promise<void>;
    handleTimetableUpload: (data: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }: any) => {
    const { currentUser } = useAuth();
    
    // Hardware-bound room identity (resolved locally from hostname or board-config.json)
    const [hardwareSection, setHardwareSection] = useState<any>(() => {
        try {
            const cached = localStorage.getItem('genatis_hardware_section');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('get-hardware-config').then((config: any) => {
                if (config?.assignedSection) {
                    setHardwareSection(config.assignedSection);
                    try {
                        localStorage.setItem('genatis_hardware_section', JSON.stringify(config.assignedSection));
                    } catch {}
                }
            }).catch(() => {});
        }
    }, []);

    // React Query hooks
    const schoolId = useSchoolId();
    const { data: userSettings } = useUserSettings(currentUser?.uid, schoolId);

    // If the account or local hardware specifies a section, lock to that section
    const lockedSection = useMemo(() => resolveAccountSection(currentUser) || hardwareSection, [currentUser, hardwareSection]);
    const isSectionLocked = Boolean(lockedSection);
    const selectedSection = lockedSection || userSettings?.selectedSection || null;

    const { data: timetableData } = useTimetable(currentUser?.uid, schoolId, selectedSection?.id);
    const updateSettingsMutation = useUpdateUserSettings(currentUser?.uid, schoolId);
    const updateTimetableMutation = useUpdateTimetable(currentUser?.uid, schoolId, selectedSection?.id);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.send('broadcast-widget-data', {
                section: selectedSection,
                timetable: timetableData
            });
        }
    }, [selectedSection, timetableData]);

    const handleSectionSelect = useCallback(async (section: any) => {
        if (isSectionLocked) {
            console.warn('[DataProvider] Cannot change section: section is locked to this account.');
            return;
        }
        await updateSettingsMutation.mutateAsync({ selectedSection: section });
    }, [isSectionLocked, updateSettingsMutation]);

    const handleTimetableUpload = useCallback(async (data: any) => {
        await updateTimetableMutation.mutateAsync(data);
        if (window.electronAPI) {
            window.electronAPI.send('broadcast-widget-data', {
                section: selectedSection,
                timetable: data
            });
        }
    }, [updateTimetableMutation, selectedSection]);

    const contextValue = useMemo(() => ({
        selectedSection,
        isSectionLocked,
        timetableData,
        handleSectionSelect,
        handleTimetableUpload
    }), [selectedSection, isSectionLocked, timetableData, handleSectionSelect, handleTimetableUpload]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

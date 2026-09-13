import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPin, Settings, EyeOff, X, Maximize2, Minimize2, Bell, Calendar } from 'lucide-react';
import { TimeService } from '../services/TimeService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';

const Widget = ({ selectedSection: propSection, timetableData: propData, isOverlay = false }: any) => {
  const [internalSection, setInternalSection] = useState<any | null>(null);
  const [internalData, setInternalData] = useState<any | null>(null);

  const selectedSection = isOverlay ? internalSection : propSection;
  const timetableData = isOverlay ? internalData : propData;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isMinimized, setIsMinimized] = useState(isOverlay ? false : StorageService.getWidgetVisibility());
  const [showReminder, setShowReminder] = useState(false);
  const [settings] = useState<any>(StorageService.getSettings());
  const [widgetSettings, setWidgetSettings] = useState(StorageService.getWidgetSettings());

  // Apply widget settings to the root element of the widget
  useEffect(() => {
    const root = document.documentElement;
    if (widgetSettings.theme === 'dark' || (widgetSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    // Apply transparency
    root.style.setProperty('--widget-transparency', (widgetSettings.transparency / 100).toString());
    // Apply font size
    root.style.fontSize = ({
      'sm': '0.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem',
    } as any)[widgetSettings.fontSize] || '1rem';

    // Inform Electron about size change
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('set-widget-size', { width: widgetSettings.width, height: widgetSettings.height });
    }
  }, [widgetSettings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setUpdateTrigger((prev: any) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      const handleSync = (event: any, data: any) => {
        if (data.section) setInternalSection(data.section);
        if (data.timetable) setInternalData(data.timetable);
      };
      const cleanup = window.electronAPI.on('broadcast-widget-data', handleSync);
      window.electronAPI.send('request-widget-sync');

      if (isOverlay) {
        window.electronAPI.invoke('set-widget-size', { width: 300, height: 220 });
      }

      return () => { if (cleanup) cleanup(); };
    }
  }, [isOverlay]);

  const { currentClass, nextClass } = useMemo(() => {
    if (!timetableData || !selectedSection) return { currentClass: null, nextClass: null };
    const todaySchedule = TimeService.getTodaySchedule(timetableData, selectedSection.id);
    return {
      currentClass: TimeService.getCurrentClass(todaySchedule),
      nextClass: TimeService.getNextClass(todaySchedule)
    };
  }, [timetableData, selectedSection, updateTrigger]);

  useEffect(() => {
    if (nextClass && TimeService.isWithinReminderTime(nextClass.startTime, settings.reminderTime)) {
      setShowReminder(true);
      if (settings.soundEnabled) {
        NotificationService.playChime();
      }
    } else {
      setShowReminder(false);
    }
  }, [nextClass, settings.reminderTime, settings.soundEnabled]);

  const closeWidget = () => {
    if (window.electronAPI) {
      window.electronAPI.invoke('close-widget');
      StorageService.saveWidgetVisibility(false);
    }
  };

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    StorageService.saveWidgetVisibility(newState); // Save visibility state
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('set-widget-minimized', newState);
    }
  };

  const formatTime = (date: any) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: any) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const widgetStyle = {
    width: `${widgetSettings.width}px`,
    height: isMinimized ? '64px' : `${widgetSettings.height}px`,
    opacity: widgetSettings.transparency / 100,
  };

  if (!selectedSection) {
    if (isOverlay) {
      return (
        <div className="w-full h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl text-gray-900 dark:text-white flex flex-col items-center justify-center border border-gray-200/50 dark:border-white/10 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="absolute top-4 right-4 z-20" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={closeWidget}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center p-6">
            <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-full mb-4 border border-gray-200 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20">
              <Calendar className="w-8 h-8 text-primary-500 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Selection</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] leading-relaxed">
              Please select a section in the main Genatis Board app window.
            </p>
          </div>

          {/* Bottom decorative line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
        </div>
      );
    }

    return (
      <div className={`glass-card rounded-2xl shadow-2xl p-6 flex items-center justify-center text-dark-text-secondary dark:text-gray-400`} style={widgetStyle}>
        <div className="text-center">
          <Calendar className="w-12 h-12 text-primary-300 mx-auto mb-3" />
          <p>No section selected</p>
        </div>
      </div>
    );
  }

  if (isOverlay) {
    return (
      <div className="w-full h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl text-gray-900 dark:text-white flex flex-col border border-gray-200/50 dark:border-white/10 overflow-hidden relative font-sans selection:bg-primary-500/30">
        {/* Dynamic Background Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/5 dark:bg-accent-500/10 blur-[60px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        {/* Header / Drag Area */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-sm z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center space-x-2 text-gray-600 dark:text-white/70">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Genatis Board</span>
          </div>
          <button
            onClick={closeWidget}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-center relative z-10">
          {/* Current Class Card */}
          <div className="mb-5 mt-4">
            <div className="inline-flex items-center mb-3 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-200/60 dark:border-white/5">
              <span className="flex h-2 w-2 relative mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Now</span>
            </div>

            {currentClass ? (
              <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200/50 dark:border-white/5 shadow-md dark:shadow-lg backdrop-blur-md">
                <h1 className="text-2xl font-bold leading-tight mb-1 text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-gray-200">
                  {currentClass.subject}
                </h1>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  <span className="truncate">{currentClass.location || 'Classroom'}</span>
                </div>

                {/* Time Progress / Remaining */}
                <div className="bg-gray-100/80 dark:bg-black/20 rounded-xl p-2.5 flex items-center justify-between border border-gray-200/50 dark:border-white/5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentClass.startTime} - {currentClass.endTime}
                  </span>
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-400/10 px-2 py-1 rounded-lg">
                    {TimeService.getTimeRemaining(currentClass.endTime)} left
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-white/40 dark:bg-white/5 rounded-3xl border border-gray-200/80 dark:border-white/5 border-dashed">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No class currently in session</p>
              </div>
            )}
          </div>

          {/* Next Class */}
          {nextClass && (
            <div className="flex items-center bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-gray-200/50 dark:border-white/5">
              <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg mr-3">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-0.5 uppercase tracking-wide">Up Next</div>
                <div className="text-sm font-semibold truncate text-gray-800 dark:text-white/90">{nextClass.subject}</div>
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-black/20 px-2 py-1 rounded">
                {TimeService.getTimeUntil(nextClass.startTime)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${showReminder ? 'ring-4 ring-accent-400 animate-pulse-soft' : ''} ${isMinimized ? 'w-16 h-16' : ''}`}
      style={widgetStyle}
    >
      {/* Header */}
      <div className="bg-primary-600 bg-opacity-90 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span className="font-semibold text-sm">Genatis Board</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title={isMinimized ? 'Maximize Widget' : 'Minimize Widget'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={closeWidget}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Close Widget"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Content */}
          <div className="p-4 space-y-4 text-dark-text-primary dark:text-gray-100">
            {/* Current Class */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center text-dark-text-secondary dark:text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Current Class
              </h3>

              {currentClass ? (
                <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-30 border border-green-200 dark:border-green-700 rounded-lg p-3 shadow-sm">
                  <div className="font-semibold text-green-900 dark:text-green-200">{currentClass.subject}</div>
                  <div className="text-sm text-green-700 dark:text-green-300 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {currentClass.location || 'Classroom'}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {currentClass.startTime} - {currentClass.endTime}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {TimeService.getTimeRemaining(currentClass.endTime)} remaining
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 dark:bg-dark-card border border-primary-200 dark:border-gray-700 rounded-lg p-3 text-center shadow-sm">
                  <div className="text-dark-text-secondary dark:text-gray-400 text-sm">No current class</div>
                </div>
              )}
            </div>

            {/* Next Class */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center text-dark-text-secondary dark:text-gray-300">
                <div className={`w-2 h-2 rounded-full mr-2 ${showReminder ? 'bg-accent-500 animate-pulse' : 'bg-primary-500'}`}></div>
                Next Class
                {showReminder && (
                  <Bell className="w-4 h-4 ml-2 text-accent-500 animate-pulse" />
                )}
              </h3>

              {nextClass ? (
                <div className={`border rounded-lg p-3 shadow-sm ${showReminder ? 'bg-accent-50 dark:bg-accent-900 dark:bg-opacity-30 border-accent-300 dark:border-accent-700' : 'bg-primary-50 dark:bg-dark-card border-primary-200 dark:border-gray-700'}`}>
                  <div className={`font-semibold ${showReminder ? 'text-accent-900 dark:text-accent-200' : 'text-primary-900 dark:text-primary-200'}`}>
                    {nextClass.subject}
                  </div>
                  <div className={`text-sm flex items-center mt-1 ${showReminder ? 'text-accent-700 dark:text-accent-300' : 'text-primary-700 dark:text-primary-300'}`}>
                    <MapPin className="w-3 h-3 mr-1" />
                    {nextClass.location || 'Classroom'}
                  </div>
                  <div className={`text-xs mt-2 ${showReminder ? 'text-accent-600 dark:text-accent-400' : 'text-primary-600 dark:text-primary-400'}`}>
                    {nextClass.startTime} - {nextClass.endTime}
                  </div>
                  <div className={`text-xs font-medium ${showReminder ? 'text-accent-600 dark:text-accent-400' : 'text-primary-600 dark:text-primary-400'}`}>
                    {showReminder ? 'Starting soon!' : `in ${TimeService.getTimeUntil(nextClass.startTime)}`}
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 dark:bg-dark-card border border-primary-200 dark:border-gray-700 rounded-lg p-3 text-center shadow-sm">
                  <div className="text-dark-text-secondary dark:text-gray-400 text-sm">No upcoming classes</div>
                </div>
              )}
            </div>

            {/* Today's Remaining Classes */}
            {timetableData && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-dark-text-secondary dark:text-gray-300">Today's Schedule</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {TimeService.getTodaySchedule(timetableData, selectedSection.id).map((classItem: any, index: number) => {
                    const isPast = TimeService.isPast(classItem.endTime);
                    const isCurrent = TimeService.isCurrentTime(classItem.startTime, classItem.endTime);

                    return (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded border shadow-sm ${isCurrent
                          ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                          : isPast
                            ? 'bg-gray-100 dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500'
                            : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{classItem.subject}</span>
                          <span>{classItem.startTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Widget;



import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Settings, EyeOff } from 'lucide-react';
import { TimeService } from '../services/TimeService.js';
import { NotificationService } from '../services/NotificationService.js';
import { StorageService } from '../services/StorageService.js';

const Widget = ({ selectedSection, timetableData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentClass, setCurrentClass] = useState(null);
  const [nextClass, setNextClass] = useState(null);
  const [isMinimized, setIsMinimized] = useState(StorageService.getWidgetVisibility()); // Use widget visibility for initial state
  const [showReminder, setShowReminder] = useState(false);
  const [settings] = useState(StorageService.getSettings());
  const [widgetSettings, setWidgetSettings] = useState(StorageService.getWidgetSettings());

  // Apply widget settings to the root element of the widget
  useEffect(() => {
    const root = document.documentElement;
    if (widgetSettings.theme === 'dark' || (widgetSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply transparency
    root.style.setProperty('--widget-transparency', widgetSettings.transparency / 100);
    // Apply font size
    root.style.fontSize = {
      'sm': '0.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem',
    }[widgetSettings.fontSize];

    // Inform Electron about size change
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('set-widget-size', { width: widgetSettings.width, height: widgetSettings.height });
    }
  }, [widgetSettings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timetableData && selectedSection) {
      const todaySchedule = TimeService.getTodaySchedule(timetableData, selectedSection.id);
      const current = TimeService.getCurrentClass(todaySchedule);
      const next = TimeService.getNextClass(todaySchedule);

      setCurrentClass(current);
      setNextClass(next);

      // Check for reminder
      if (next && TimeService.isWithinReminderTime(next.startTime, settings.reminderTime)) {
        setShowReminder(true);
        // Play chime sound if enabled
        if (settings.soundEnabled) {
          NotificationService.playChime();
        }
      } else {
        setShowReminder(false);
      }
    }
  }, [timetableData, selectedSection, currentTime, settings.reminderTime, settings.soundEnabled]);

  const closeWidget = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('close-widget');
      StorageService.saveWidgetVisibility(false); // Save visibility state
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

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
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
    return (
      <div className="w-80 h-96 glass-card rounded-2xl shadow-2xl p-6 flex items-center justify-center text-dark-text-secondary dark:text-gray-400" style={widgetStyle}>
        <div className="text-center">
          <Calendar className="w-12 h-12 text-primary-300 mx-auto mb-3" />
          <p>No section selected</p>
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
          <span className="font-semibold text-sm">ClassPoint</span>
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
                  {TimeService.getTodaySchedule(timetableData, selectedSection.id).map((classItem, index) => {
                    const isPast = TimeService.isPast(classItem.endTime);
                    const isCurrent = TimeService.isCurrentTime(classItem.startTime, classItem.endTime);

                    return (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded border shadow-sm ${
                          isCurrent
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

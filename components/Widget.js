import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, Bell, X, Minimize2 } from 'lucide-react';
import { TimeService } from '../services/TimeService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';

const Widget = ({ selectedSection, timetableData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentClass, setCurrentClass] = useState(null);
  const [nextClass, setNextClass] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [settings] = useState(StorageService.getSettings());

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

  if (!selectedSection) {
    return (
      <div className="w-80 h-96 glass rounded-2xl shadow-2xl p-6 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No section selected</p>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="w-16 h-16 glass rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center text-primary-600"
        >
          <Clock className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className={`w-80 glass rounded-2xl shadow-2xl overflow-hidden ${showReminder ? 'ring-4 ring-yellow-400 animate-pulse-soft' : ''}`}>
      {/* Header */}
      <div className="bg-primary-600 bg-opacity-90 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">ClassPoint</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={closeWidget}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
          <div className="text-sm opacity-90">{formatDate(currentTime)}</div>
          <div className="text-xs opacity-75 mt-1">{selectedSection.name}</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Current Class */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Current Class
          </h3>
          
          {currentClass ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="font-semibold text-green-900">{currentClass.subject}</div>
              <div className="text-sm text-green-700 flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {currentClass.location || 'Classroom'}
              </div>
              <div className="text-xs text-green-600 mt-2">
                {currentClass.startTime} - {currentClass.endTime}
              </div>
              <div className="text-xs text-green-600 font-medium">
                {TimeService.getTimeRemaining(currentClass.endTime)} remaining
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-gray-500 text-sm">No current class</div>
            </div>
          )}
        </div>

        {/* Next Class */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${showReminder ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}`}></div>
            Next Class
            {showReminder && (
              <Bell className="w-4 h-4 ml-2 text-yellow-600 animate-pulse" />
            )}
          </h3>
          
          {nextClass ? (
            <div className={`border rounded-lg p-3 ${showReminder ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'}`}>
              <div className={`font-semibold ${showReminder ? 'text-yellow-900' : 'text-blue-900'}`}>
                {nextClass.subject}
              </div>
              <div className={`text-sm flex items-center mt-1 ${showReminder ? 'text-yellow-700' : 'text-blue-700'}`}>
                <MapPin className="w-3 h-3 mr-1" />
                {nextClass.location || 'Classroom'}
              </div>
              <div className={`text-xs mt-2 ${showReminder ? 'text-yellow-600' : 'text-blue-600'}`}>
                {nextClass.startTime} - {nextClass.endTime}
              </div>
              <div className={`text-xs font-medium ${showReminder ? 'text-yellow-600' : 'text-blue-600'}`}>
                {showReminder ? 'Starting soon!' : `in ${TimeService.getTimeUntil(nextClass.startTime)}`}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-gray-500 text-sm">No upcoming classes</div>
            </div>
          )}
        </div>

        {/* Today's Remaining Classes */}
        {timetableData && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Today's Schedule</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {TimeService.getTodaySchedule(timetableData, selectedSection.id).map((classItem, index) => {
                const isPast = TimeService.isPast(classItem.endTime);
                const isCurrent = TimeService.isCurrentTime(classItem.startTime, classItem.endTime);
                
                return (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${
                      isCurrent 
                        ? 'bg-green-100 border-green-300 text-green-800' 
                        : isPast 
                        ? 'bg-gray-100 border-gray-200 text-gray-500' 
                        : 'bg-white border-gray-200 text-gray-700'
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
    </div>
  );
};

export default Widget;
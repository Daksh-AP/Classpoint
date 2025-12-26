import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Calendar, 
  Clock, 
  Settings, 
  Eye, 
  EyeOff,
  RefreshCw,
  BookOpen,
  MapPin,
  Cloud
} from 'lucide-react';
import SettingsModal from './SettingsModal';
import { TimeService } from '../services/TimeService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { generateDemoTimetable } from '../utils/DemoData';

const MainDashboard = ({ 
  selectedSection, 
  timetableData, 
  onTimetableUpload, 
  onSectionChange 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [nextClass, setNextClass] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(StorageService.getSettings());
  const [lastReminderTime, setLastReminderTime] = useState(null);

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

      // Check for reminders
      if (next && settings.notifications && TimeService.isWithinReminderTime(next.startTime, settings.reminderTime)) {
        const reminderKey = `${next.subject}-${next.startTime}`;
        if (lastReminderTime !== reminderKey) {
          setLastReminderTime(reminderKey);
          if (settings.soundEnabled) {
            NotificationService.showReminderWithChime(next);
          } else {
            NotificationService.showClassReminder(next);
          }
        }
      }
    }
  }, [timetableData, selectedSection, currentTime, settings, lastReminderTime]);

  const toggleWidget = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      if (widgetVisible) {
        ipcRenderer.invoke('hide-widget');
      } else {
        ipcRenderer.invoke('show-widget');
      }
      setWidgetVisible(!widgetVisible);
    }
  };

  const openQuickdrop = () => {
    if (window.require) {
      const { shell } = window.require('electron');
      shell.openExternal('https://quickdrop-drab.vercel.app/');
    } else {
      // Fallback for web version
      window.open('https://quickdrop-drab.vercel.app/', '_blank');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 glass animate-fade-in"> {/* Added glass and fade-in */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20"> {/* Increased height */}
            <div className="flex items-center space-x-4">
              <div className="bg-primary-600 p-3 rounded-xl shadow-md animate-float"> {/* Increased padding, rounded-xl, shadow, and float animation */}
                <BookOpen className="w-7 h-7 text-white" /> {/* Increased icon size */}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ClassPoint</h1> {/* Increased font size and weight */}
                <p className="text-base text-gray-600">{selectedSection.name}</p> {/* Increased font size, darker text */}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-base font-medium text-gray-900">{formatTime(currentTime)}</p> {/* Increased font size */}
                <p className="text-sm text-gray-600">{formatDate(currentTime)}</p> {/* Increased font size, darker text */}
              </div>
              
              <div className="flex items-center space-x-3"> {/* Adjusted space */}
                <button
                  onClick={openQuickdrop}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
                  title="Open Quickdrop - File Sharing App"
                >
                  <Cloud className="w-5 h-5" />
                  <span className="font-medium">Quickdrop</span>
                </button>
                
                <button
                  onClick={toggleWidget}
                  className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 shadow-sm"
                  title={widgetVisible ? 'Hide Widget' : 'Show Widget'}
                >
                  {widgetVisible ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 shadow-sm"
                  title="Settings"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Current Class Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-pop-in hover:shadow-2xl transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="w-6 h-6 mr-3 text-primary-600" />
                Current Class
              </h3>
              {currentClass && (
                <span className="px-4 py-2 bg-green-500 text-white text-base font-semibold rounded-full shadow-md animate-pulse-soft">
                  Live
                </span>
              )}
            </div>
            
            {currentClass ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-extrabold text-gray-900">{currentClass.subject}</p>
                  <p className="text-lg text-gray-700 flex items-center mt-2">
                    <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                    {currentClass.location || 'Classroom'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-gray-600">
                    {currentClass.startTime} - {currentClass.endTime}
                  </span>
                  <span className="text-primary-700 font-bold">
                    {TimeService.getTimeRemaining(currentClass.endTime)} remaining
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
                <p className="text-lg text-gray-500">No class currently scheduled</p>
              </div>
            )}
          </div>

          {/* Next Class Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-pop-in hover:shadow-2xl transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <RefreshCw className="w-6 h-6 mr-3 text-primary-600" />
                Next Class
              </h3>
              {nextClass && TimeService.isWithinReminderTime(nextClass.startTime) && (
                <span className="px-4 py-2 bg-yellow-500 text-white text-base font-semibold rounded-full shadow-md animate-pulse-soft">
                  Soon
                </span>
              )}
            </div>
            
            {nextClass ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-extrabold text-gray-900">{nextClass.subject}</p>
                  <p className="text-lg text-gray-700 flex items-center mt-2">
                    <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                    {nextClass.location || 'Classroom'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-gray-600">
                    {nextClass.startTime} - {nextClass.endTime}
                  </span>
                  <span className="text-primary-700 font-bold">
                    in {TimeService.getTimeUntil(nextClass.startTime)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
                <p className="text-lg text-gray-500">No upcoming classes today</p>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Actions - Simplified for now */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-pop-in">
          <div className="text-center">
            <div className="flex justify-center space-x-6 mb-8">
              <button
                onClick={handleDemoData}
                className="flex items-center space-x-3 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg font-semibold"
              >
                <Calendar className="w-5 h-5" />
                <span>Load Demo Timetable</span>
              </button>
            </div>
            <div className="mt-8">
              <Calendar className="w-20 h-20 text-primary-400 mx-auto mb-5 animate-float" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Timetable Status
              </h3>
              {timetableData ? (
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Your schedule is active and tracking your classes. Use the widget or check the current/next class cards above.
                </p>
              ) : (
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  No timetable loaded. Load a demo timetable to get started.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
        }}
        selectedSection={selectedSection}
        onSectionChange={onSectionChange}
      />
    </div>
  );
};

export default MainDashboard;

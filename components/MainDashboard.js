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
  Cloud,
  Edit2,
  LogOut,
  BarChart2
} from 'lucide-react';
import ManualTimetableEntry from './ManualTimetableEntry';
import SettingsModal from './SettingsModal';
import TimetableDisplay from './TimetableDisplay';
import { TimeService } from '../services/TimeService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import AttendanceDashboard from './AttendanceDashboard';

const MainDashboard = ({ 
  selectedSection, 
  timetableData, 
  onTimetableUpdate, 
  onSectionChange,
  onSettingsChange,
  currentUser,
  onSignOut
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [nextClass, setNextClass] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showAttendanceReports, setShowAttendanceReports] = useState(false);
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

  const handleScheduleSave = (data) => {
    onTimetableUpdate(data);
    setShowScheduleEditor(false);
  };

  // Show Schedule Editor
  if (showScheduleEditor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
              <Edit2 className="w-6 h-6 mr-3 text-primary-600" />
              Edit Schedule
            </h2>
            <p className="text-gray-500 text-sm">
              Changes will sync automatically to all your devices.
            </p>
          </div>
          
          <ManualTimetableEntry
            onSave={handleScheduleSave}
            onCancel={() => setShowScheduleEditor(false)}
            selectedSection={selectedSection}
            initialTimetable={timetableData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 glass animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-600 p-3 rounded-xl shadow-md animate-float">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ClassPoint</h1>
                <p className="text-base text-gray-600">{selectedSection.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-base font-medium text-gray-900">{formatTime(currentTime)}</p>
                <p className="text-sm text-gray-600">{formatDate(currentTime)}</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowScheduleEditor(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
                  title="Edit Schedule"
                >
                  <Edit2 className="w-5 h-5" />
                  <span className="font-medium">Edit Schedule</span>
                </button>

                <button
                  onClick={() => setShowAttendanceReports(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
                  title="Attendance Reports"
                >
                  <BarChart2 className="w-5 h-5" />
                  <span className="font-medium">Reports</span>
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 shadow-sm"
                  title="Settings"
>
                  <Settings className="w-6 h-6" />
                </button>

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 shadow-sm"
                    title="Sign Out"
                  >
                    <LogOut className="w-6 h-6" />
                  </button>
                )}
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

        {/* Schedule Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-pop-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-6 h-6 mr-3 text-primary-600" />
              Schedule
            </h3>
            <button
              onClick={() => setShowScheduleEditor(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>

          {timetableData ? (
            <TimetableDisplay
              timetableData={timetableData}
              selectedSection={selectedSection}
              currentTime={currentTime}
            />
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-20 h-20 text-primary-400 mx-auto mb-5 animate-float" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                No Schedule Yet
              </h3>
              <p className="text-lg text-gray-600 max-w-md mx-auto mb-6">
                Create your timetable to start tracking classes.
              </p>
              <button
                onClick={() => setShowScheduleEditor(true)}
                className="flex items-center space-x-3 px-8 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg font-semibold mx-auto"
              >
                <Edit2 className="w-5 h-5" />
                <span>Create Schedule</span>
              </button>
            </div>
          )}
        </div>

        {/* Sync Status */}
        {currentUser && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400 flex items-center justify-center space-x-2">
              <Cloud className="w-4 h-4" />
              <span>Synced with {currentUser.email}</span>
            </p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          if (onSettingsChange) onSettingsChange(newSettings);
        }}
        selectedSection={selectedSection}
        onSectionChange={onSectionChange}
      />

      {/* Attendance Reports Modal */}
      {showAttendanceReports && (
        <AttendanceDashboard
          selectedSection={selectedSection}
          onClose={() => setShowAttendanceReports(false)}
        />
      )}
    </div>
  );
};

export default MainDashboard;

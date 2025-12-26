import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Calendar,
  Clock,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
  MapPin,
  PlusCircle,
  ListTodo,
  Menu,
  UserCheck,
  PenTool,
  FolderOpen,
  Globe,
  Quote,
  Timer,
} from 'lucide-react';
import SettingsModal from './SettingsModal.jsx';
import ManualTimetableEntry from './ManualTimetableEntry.jsx';
import TimeDisplay from './TimeDisplay.jsx';
import ClassCard from './ClassCard.jsx';
import { TimeService } from '../services/TimeService.js';
import { NotificationService } from '../services/NotificationService.js';
import { StorageService } from '../services/StorageService.js';
import TimetableDisplay from './TimetableDisplay.jsx';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, setDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

const MainDashboard = ({
  selectedSection,
  timetableData,
  onTimetableUpload,
  onSectionChange,
  onSettingsChange,
  setShowAttendanceTracker,
  openSettingsModal,
  openMenu,
  onShowResourceHub,
  onShowWhiteboard,
  onShowBrowser,
  onShowTimer,
}) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [settings, setSettings] = useState(StorageService.getSettings());
  const [lastReminderTime, setLastReminderTime] = useState(null);
  const [teacherDestination, setTeacherDestination] = useState(null);



  // Update class calculations every minute instead of every second
  useEffect(() => {
    const timer = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Memoize class calculations to prevent unnecessary recalculations
  // IMPORTANT: This must be defined BEFORE the useEffect hooks that depend on currentClass and nextClass
  const { currentClass, nextClass, remainingClasses } = useMemo(() => {
    if (!timetableData || !selectedSection) {
      return { currentClass: null, nextClass: null, remainingClasses: [] };
    }

    const todaySchedule = TimeService.getTodaySchedule(timetableData, selectedSection.id);
    return {
      currentClass: TimeService.getCurrentClass(todaySchedule),
      nextClass: TimeService.getNextClass(todaySchedule),
      remainingClasses: TimeService.getRemainingClasses(todaySchedule)
    };
  }, [timetableData, selectedSection, updateTrigger]);

  // 1. Broadcast who we are expecting next (so the previous class knows where to send them)
  useEffect(() => {
    if (selectedSection) {
      const boardRef = doc(db, 'smartboards', selectedSection.id);
      const incomingName = nextClass ? nextClass.teacher : null;

      setDoc(boardRef, {
        teacherIncoming: incomingName,
        name: selectedSection.name, // Ensure name is always up to date for the alert
        lastUpdated: new Date()
      }, { merge: true }).catch(err => console.error("Error broadcasting incoming teacher:", err));
    }
  }, [selectedSection, nextClass]);

  // 2. Find out where our CURRENT teacher needs to go next
  useEffect(() => {
    if (currentClass && currentClass.teacher) {
      const boardsRef = collection(db, 'smartboards');
      // "Who is expecting my current teacher?"
      const q = query(boardsRef, where("teacherIncoming", "==", currentClass.teacher));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Found the class that needs our teacher!
          const destBoard = snapshot.docs[0].data();
          setTeacherDestination({
            location: destBoard.name || "Unknown Location",
            teacher: currentClass.teacher
          });
        } else {
          setTeacherDestination(null);
        }
      });

      return () => unsubscribe();
    } else {
      setTeacherDestination(null);
    }
  }, [currentClass]);

  // Handle notifications separately
  useEffect(() => {
    if (nextClass && settings.notifications && TimeService.isWithinReminderTime(nextClass.startTime, settings.reminderTime)) {
      const reminderKey = `${nextClass.subject}-${nextClass.startTime}`;
      if (lastReminderTime !== reminderKey) {
        setLastReminderTime(reminderKey);
        if (settings.soundEnabled) {
          NotificationService.showReminderWithChime(nextClass);
        } else {
          NotificationService.showClassReminder(nextClass);
        }
      }
    }
  }, [nextClass, settings, lastReminderTime]);

  const handleTimetableSave = useCallback((data) => {
    onTimetableUpload(data);
    setShowManualEntry(false);
  }, [onTimetableUpload]);

  const toggleWidget = useCallback(() => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      if (widgetVisible) {
        ipcRenderer.invoke('hide-widget');
      } else {
        ipcRenderer.invoke('show-widget');
      }
      setWidgetVisible(!widgetVisible);
    }
  }, [widgetVisible]);

  const currentDate = useMemo(() => new Date(), [updateTrigger]);

  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  }, []);

  return (
    <div className="min-h-screen text-slate-200 relative overflow-hidden">
      {/* Background Blobs - Optimized */}
      {/* Background Blobs - Optimized (Static) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-900/10 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-accent-900/10 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
      </div>

      <header className="glass-card mx-4 mt-4 p-4 sticky top-4 z-50 border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button onClick={openMenu} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                <Menu className="w-6 h-6" />
              </button>
              <div className="bg-primary-500/20 p-2 rounded-lg border border-primary-500/30">
                <BookOpen className="w-6 h-6 text-primary-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  ClassPoint
                </h1>
                <p className="text-slate-400 text-sm font-medium tracking-wide">{selectedSection.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <TimeDisplay />

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAttendanceTracker(true)}
                  className="glass-button flex items-center space-x-2 text-sm bg-primary-600/20 hover:bg-primary-600/30 border-primary-500/30 text-primary-200"
                  title="Open Attendance Tracker"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Attendance</span>
                </button>

                <button
                  onClick={toggleWidget}
                  className={`p-2 rounded-lg transition-all duration-300 ${widgetVisible ? 'bg-accent-500/20 text-accent-300' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
                  title={widgetVisible ? 'Hide Widget' : 'Show Widget'}
                >
                  {widgetVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>

                <button
                  onClick={openSettingsModal}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">


        {showManualEntry ? (
          <div className="glass-card animate-fade-in">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <PlusCircle className="w-5 h-5 mr-3 text-primary-400" />
                Manual Timetable Entry
              </h2>
            </div>
            <div className="p-6">
              <ManualTimetableEntry
                onSave={handleTimetableSave}
                onCancel={() => setShowManualEntry(false)}
                selectedSection={selectedSection}
                initialTimetable={timetableData}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="mb-8 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                Good {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">{selectedSection.name}</span>
              </h1>
              <p className="text-slate-400 text-lg flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary-400" />
                {formatDate(currentDate)}
              </p>
            </div>

            {/* Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Weather Widget */}


              {/* Quote Widget */}
              <div className="glass-card p-6 md:col-span-3 flex items-center hover:bg-white/5 transition-colors relative overflow-hidden">
                <Quote className="absolute top-4 right-4 w-12 h-12 text-white/5 rotate-180" />
                <div className="flex items-start z-10">
                  <Quote className="w-6 h-6 text-primary-400 mr-4 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 italic text-lg leading-relaxed">"Education is the most powerful weapon which you can use to change the world."</p>
                    <p className="text-slate-500 text-sm mt-2 font-medium">— Nelson Mandela</p>
                  </div>
                </div>
              </div>
            </div>

            {teacherDestination && (
              <div className="glass-card p-6 mb-8 border-l-4 border-l-green-500 bg-green-500/10 animate-slide-up">
                <h3 className="text-lg font-semibold text-green-300 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Next Class Alert
                </h3>
                <p className="text-slate-300 mt-1">
                  <span className="font-bold text-white">{teacherDestination.teacher}</span>, your next class is in <span className="font-bold text-green-300 text-xl">{teacherDestination.location}</span>.
                </p>
              </div>
            )}



            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <ClassCard classData={currentClass} type="current" />
              <ClassCard classData={nextClass} type="next" />
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <button
                onClick={onShowTimer}
                className="glass-card p-6 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock className="w-16 h-16 text-orange-400" />
                </div>
                <div className="p-3 rounded-xl bg-orange-500/20 w-fit mb-4">
                  <Timer className="w-6 h-6 text-orange-300" />
                </div>
                <h3 className="font-semibold text-white text-lg">Timer</h3>
                <p className="text-sm text-slate-400 mt-1">Countdown</p>
              </button>

              <button
                onClick={onShowWhiteboard}
                className="glass-card p-6 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <PenTool className="w-16 h-16 text-purple-400" />
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20 w-fit mb-4">
                  <PenTool className="w-6 h-6 text-purple-300" />
                </div>
                <h3 className="font-semibold text-white text-lg">Whiteboard</h3>
                <p className="text-sm text-slate-400 mt-1">Draw & Explain</p>
              </button>

              <button
                onClick={onShowResourceHub}
                className="glass-card p-6 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FolderOpen className="w-16 h-16 text-blue-400" />
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20 w-fit mb-4">
                  <FolderOpen className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="font-semibold text-white text-lg">Resources</h3>
                <p className="text-sm text-slate-400 mt-1">Files & Media</p>
              </button>

              <button
                onClick={onShowBrowser}
                className="glass-card p-6 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Globe className="w-16 h-16 text-cyan-400" />
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/20 w-fit mb-4">
                  <Globe className="w-6 h-6 text-cyan-300" />
                </div>
                <h3 className="font-semibold text-white text-lg">Browser</h3>
                <p className="text-sm text-slate-400 mt-1">Web Access</p>
              </button>

              <button
                onClick={setShowAttendanceTracker}
                className="glass-card p-6 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <UserCheck className="w-16 h-16 text-green-400" />
                </div>
                <div className="p-3 rounded-xl bg-green-500/20 w-fit mb-4">
                  <UserCheck className="w-6 h-6 text-green-300" />
                </div>
                <h3 className="font-semibold text-white text-lg">Attendance</h3>
                <p className="text-sm text-slate-400 mt-1">Track Students</p>
              </button>
            </div>

            {remainingClasses.length > 0 && (
              <div className="glass-card p-6 mb-8">
                <h3 className="text-lg font-semibold text-white flex items-center mb-6">
                  <ListTodo className="w-5 h-5 mr-3 text-primary-400" />
                  Remaining Classes Today
                </h3>
                <div className="space-y-3">
                  {remainingClasses.map((cls, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-primary-500 group-hover:scale-125 transition-transform"></div>
                        <span className="font-medium text-slate-200">{cls.subject}</span>
                        <span className="text-sm text-slate-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {cls.location || 'Classroom'}
                        </span>
                      </div>
                      <span className="text-sm font-mono text-slate-400 bg-black/20 px-3 py-1 rounded-lg">
                        {cls.startTime} - {cls.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card p-8 text-center">
              <div className="max-w-md mx-auto">
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="w-full flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="font-semibold text-lg">{timetableData ? 'Edit Timetable' : 'Create Timetable'}</span>
                </button>

                {!timetableData ? (
                  <div className="mt-8 text-slate-400">
                    <p>Create your timetable to start tracking your classes</p>
                  </div>
                ) : (
                  <div className="mt-6 text-slate-500 text-sm">
                    <p>Your schedule is active and tracking your classes.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MainDashboard;

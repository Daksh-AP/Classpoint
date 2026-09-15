import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Settings,
  ListTodo,
  Menu,
  UserCheck,
  PenTool,
  FolderOpen,
  Globe,
  Quote,
  Timer,
  PlusCircle,
  MapPin,
  ChevronRight
} from 'lucide-react';
import ManualTimetableEntry from './ManualTimetableEntry';
import ScheduleUploader from './ScheduleUploader';
import ClassCard from './ClassCard';
import ClassroomDock from './ClassroomDock';
import OpenLoopsWidget from './OpenLoopsWidget';
import PeriodHandoverModal from './PeriodHandoverModal';
import { AnimatePresence } from 'framer-motion';
// import DynamicFocusBar from './DynamicFocusBar'; // Replaced by ClassroomDock
import { TimeService } from '../services/TimeService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { doc, onSnapshot, setDoc, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import AnnouncementBanner from './AnnouncementBanner';
import ClassContextDashboard from './ClassContextDashboard';
import { useTools } from '../context/ToolProvider';
import { useSchoolId } from '../hooks/useSchoolId';


interface MainDashboardProps {
  selectedSection: any
  timetableData: any
  onTimetableUpload: (data: any) => Promise<void> | void;
  onSectionChange: (section: any) => void;
  setShowAttendanceTracker: (show: boolean) => void;
  openSettingsModal: () => void;
  isSettingsOpen?: boolean;
  openMenu: () => void;
  onShowResourceHub: () => void;
  onShowWhiteboard: () => void;
  onShowBrowser: (url?: string) => void;
  onShowTimer: () => void;
  activeView: 'dashboard' | 'classContext' | 'schedule';
  setActiveView: (view: 'dashboard' | 'classContext' | 'schedule') => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({
  selectedSection,
  timetableData,
  onTimetableUpload,
  onSectionChange,
  setShowAttendanceTracker,
  openSettingsModal,
  isSettingsOpen = false,
  openMenu,
  onShowResourceHub,
  onShowWhiteboard,
  onShowBrowser,
  onShowTimer,
  activeView,
  setActiveView,
}: any) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const { openTool } = useTools();
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [settings] = useState<any>(StorageService.getSettings());
  const [lastReminderTime, setLastReminderTime] = useState<string | null>(null);
  const [teacherDestination, setTeacherDestination] = useState<{teacher: string, location: string} | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const schoolId = useSchoolId();
  const [activeHandoverClass, setActiveHandoverClass] = useState<any>(null);
  const [lastHandoverKey, setLastHandoverKey] = useState<string>('');


  useEffect(() => {
    const timer = setInterval(() => setUpdateTrigger((prev: any) => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, `schools/${schoolId}/calendar`), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.fromCache && snapshot.empty) return;
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((ev: any) => ev.audience === 'all' || ev.audience === 'staff');
      setEvents(data.slice(0, 3));
    });
    return () => unsubscribe();
  }, []);

  const { currentClass, nextClass, remainingClasses } = useMemo(() => {
    if (!timetableData || !selectedSection) {
      return { currentClass: null, nextClass: null, remainingClasses: [] };
    }
    const todaySchedule = TimeService.getTodaySchedule(timetableData, selectedSection.id);
    return {
      currentClass: TimeService.getCurrentClass(todaySchedule) || null,
      nextClass: TimeService.getNextClass(todaySchedule) || null,
      remainingClasses: TimeService.getRemainingClasses(todaySchedule) || []
    };
  }, [timetableData, selectedSection, updateTrigger]);

  useEffect(() => {
    if (currentClass) {
      const classKey = `${currentClass.subject}-${currentClass.startTime}-${currentClass.endTime}`;
      if (lastHandoverKey && lastHandoverKey !== classKey) {
        // A new period has started on the bell schedule
        setActiveHandoverClass(currentClass);
      }
      setLastHandoverKey(classKey);
    }
  }, [currentClass, lastHandoverKey]);

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

  useEffect(() => {
    if (window.electronAPI) {
      const handleWidgetClosed = () => setWidgetVisible(false);
      const cleanup = window.electronAPI.on('widget-closed', handleWidgetClosed);
      return () => { if (cleanup) cleanup(); };
    }
  }, []);

  const toggleWidget = useCallback(() => {
    if (window.electronAPI) {
      if (widgetVisible) window.electronAPI.invoke('hide-widget');
      else window.electronAPI.invoke('show-widget');
      setWidgetVisible(!widgetVisible);
    }
  }, [widgetVisible]);

  const currentDate = useMemo(() => new Date(), [updateTrigger]);
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  }, []);

  const formatSectionName = (name: string) => {
    if (!name) return null;
    const match = name.match(/^(.*?)(\d+)$/);
    if (match && match[1] && match[2]) {
      return (
        <>
          <span style={{ color: 'var(--accent)' }}>{match[1].trim()}</span>{' '}
          <span style={{ color: 'var(--accent-secondary, var(--accent))' }}>{match[2]}</span>
        </>
      );
    }
    return <span style={{ color: 'var(--accent)' }}>{name}</span>;
  };

  return (
    <div
      className="min-h-screen app-background relative overflow-y-auto overflow-x-hidden pt-20 pb-12"
    >

      <AnnouncementBanner classId={selectedSection?.id} />

      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full mix-blend-normal"
          style={{ background: 'var(--accent-soft)', filter: 'blur(100px)', opacity: 0.5 }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full mix-blend-normal"
          style={{ background: 'var(--accent-soft)', filter: 'blur(100px)', opacity: 0.3 }}
        />
      </div>

      <AnimatePresence>
        {!isSettingsOpen && (
          <ClassroomDock 
            key="classroom-dock"
            currentClass={currentClass} 
            nextClass={nextClass} 
            isQuickGridActive={remainingClasses.length === 0}
            activeView={activeView}
            onOpenSchedule={() => setActiveView('schedule')}
            onOpenContext={() => setActiveView('classContext')}
            onOpenSettings={openSettingsModal}
            onOpenDashboard={() => setActiveView('dashboard')}
          />
        )}
      </AnimatePresence>

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-50 pointer-events-none">
        <button
          onClick={activeView === 'dashboard' ? openMenu : () => setActiveView('dashboard')}
          className="p-3 rounded-xl transition-all active:scale-[0.95] flex items-center gap-3 pr-5 group bg-zen-surface border border-zen-text/10 pointer-events-auto shadow-sm"
        >
          {activeView === 'dashboard' ? (
            <Menu className="w-6 h-6" style={{ color: 'var(--text-primary)' }} strokeWidth={1.5} />
          ) : (
            <>
              <ChevronRight className="w-5 h-5 rotate-180" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              <span className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>Back to Dashboard</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={openSettingsModal}
            className="p-3 rounded-xl transition-all active:scale-[0.95] flex items-center gap-2.5 group bg-zen-surface border border-zen-text/10 shadow-sm"
            title="Settings & Setup"
          >
            <Settings className="w-5 h-5 transition-transform group-hover:rotate-45" style={{ color: 'var(--text-primary)' }} strokeWidth={1.5} />
            <span className="text-body font-medium pr-1" style={{ color: 'var(--text-primary)' }}>Settings</span>
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 relative z-10 w-full animate-fade-in">

        {activeView === 'schedule' ? (
          <div className="zen-card p-8 mt-8 animate-fade-up">
            <h2 className="text-h2 mb-6 flex items-center gap-3">
              <PlusCircle className="w-6 h-6" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              Master Schedule & Timetable
            </h2>
            <ScheduleUploader
              onSave={async (data: any) => {
                await onTimetableUpload(data);
                setActiveView('dashboard');
              }}
              onCancel={() => setActiveView('dashboard')}
              selectedSection={selectedSection}
              initialTimetable={timetableData}
            />
          </div>
        ) : activeView === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }} className="animate-fade-up">
            {/* Hero Greeting & Quote */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
              <div className="flex-1">
                <h1 className="text-h1 mb-2">
                  Good {greeting},<br />
                  <span className="block truncate max-w-xs md:max-w-sm">{formatSectionName(selectedSection.name)}</span>
                </h1>
                <p className="text-label flex items-center gap-2 mt-4 text-zen-text-2">
                  <Calendar className="w-4 h-4 opacity-70" strokeWidth={1.5} />
                  {formatDate(currentDate)}
                </p>
              </div>

              <div className="zen-card-flat p-6 flex flex-col justify-center relative overflow-hidden w-full md:w-[45%] lg:w-[40%] bg-zen-surface/40">
                <Quote
                  className="absolute -top-4 -right-4 w-24 h-24 rotate-180 pointer-events-none opacity-50"
                  style={{ color: 'var(--glass-border)' }}
                />
                <div className="relative z-10">
                  <p className="text-body italic leading-relaxed font-light text-zen-text-2" style={{ fontSize: '1rem' }}>
                    "Education is the most powerful weapon which you can use to change the world."
                  </p>
                  <p className="text-small mt-3 font-medium text-zen-text-2 opacity-80">— Nelson Mandela</p>
                </div>
              </div>
            </div>

            {/* Teacher Destination Alert */}
            {teacherDestination && (
              <div
                className="zen-card-flat p-6 flex items-center justify-between border-l-[3px] border-zen-accent"
              >
                <div>
                  <h3 className="text-label mb-1" style={{ color: 'var(--accent)' }}>Incoming Teacher Alert</h3>
                  <p className="text-body">
                    <span className="font-medium">{teacherDestination.teacher}</span> is heading to{' '}
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>{teacherDestination.location}</span>.
                  </p>
                </div>
                <div
                  className="w-3 h-3 rounded-full animate-pulse bg-zen-accent shadow-[0_0_10px_var(--accent)]"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClassCard classData={currentClass as any} type="current" />
              <ClassCard classData={nextClass as any} type="next" />
            </div>

            <OpenLoopsWidget selectedSection={selectedSection} currentClass={currentClass} />


            {/* Remaining Classes */}
            {remainingClasses.length > 0 && (
              <div className="zen-card-flat p-6">
                <h3 className="text-label mb-4 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" strokeWidth={1.5} />
                  Remaining Today
                </h3>
                <div className="space-y-1">
                  {remainingClasses.map((cls: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl transition-colors duration-200 hover:bg-zen-bg/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-zen-accent" />
                        <span className="text-body font-medium">{cls.subject}</span>
                        <span className="text-small hidden sm:flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                          {cls.location || 'Classroom'}
                        </span>
                      </div>
                      <span
                        className="text-small font-medium px-3 py-1.5 rounded-lg font-mono bg-zen-surface border border-zen-text/10"
                      >
                        {cls.startTime} – {cls.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {events.length > 0 && (
              <div className="zen-card-flat p-6 mt-6">
                <h3 className="text-label mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" strokeWidth={1.5} />
                  Upcoming Events
                </h3>
                <div className="space-y-3">
                  {events.map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl border-l-[3px] transition-colors duration-200 hover:bg-zen-bg/40" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-secondary)' }}>
                      <div>
                        <span className="text-body font-medium block" style={{ color: 'var(--text-primary)' }}>{ev.title}</span>
                        <span className="text-small mt-1 block font-semibold opacity-70" style={{ color: 'var(--accent)' }}>
                          {String(ev.type).toUpperCase()} • {ev.audience === 'staff' ? 'Staff Only' : 'All School'}
                        </span>
                      </div>
                      <div className="text-right bg-zen-surface px-4 py-2 rounded-lg border border-zen-text/10">
                        <span className="text-body font-bold block" style={{ color: 'var(--text-primary)' }}>{new Date(ev.date).getDate()}</span>
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State / Quick Actions */}
            {remainingClasses.length === 0 && (
              <div className="mt-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-6 px-2">
                   <h3 className="text-h3" style={{ color: 'var(--text-secondary)' }}>Quick Tools</h3>
                   <div className="h-[1px] flex-1 ml-6 bg-gradient-to-r from-zen-text/10 to-transparent" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'whiteboard', icon: PenTool, label: 'Whiteboard', desc: 'Start drawing', color: '#BF5AF2', onClick: onShowWhiteboard },
                    { id: 'browser', icon: Globe, label: 'Browser', desc: 'Search the web', color: '#64D2FF', onClick: () => onShowBrowser() },
                    { id: 'timer', icon: Timer, label: 'Timer', desc: 'Focus countdown', color: '#FF9F0A', onClick: () => openTool('timer') },
                    { id: 'attendance', icon: UserCheck, label: 'Attendance', desc: 'Log students', color: '#30D158', onClick: () => setShowAttendanceTracker(true) },
                  ].map((action) => (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className="zen-card-flat p-6 flex flex-col items-center justify-center text-center gap-3 transition-all hover:-translate-y-1 hover:shadow-xl group"
                      style={{ borderTop: `3px solid ${action.color}40`, backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: `${action.color}15`, color: action.color }}
                      >
                        <action.icon size={28} strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="text-body font-bold block mt-2" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
                        <span className="text-small opacity-70" style={{ color: 'var(--text-secondary)' }}>{action.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-up">
            <ClassContextDashboard selectedSection={selectedSection} />
          </div>
        )}
      </main>

      {activeHandoverClass && (
        <PeriodHandoverModal
          currentClass={activeHandoverClass}
          sectionName={selectedSection?.name}
          onConfirm={() => setActiveHandoverClass(null)}
          onExtend={() => {
            setActiveHandoverClass(null);
            setTimeout(() => {
              if (currentClass) setActiveHandoverClass(currentClass);
            }, 5 * 60 * 1000);
          }}
          onDismiss={() => setActiveHandoverClass(null)}
        />
      )}
    </div>
  );
};

export default MainDashboard;

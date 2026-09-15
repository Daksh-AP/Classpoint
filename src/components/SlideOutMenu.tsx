import React from 'react';
import { X, Folder, UserCheck, PenTool, Globe, Clock, BookOpen, Calendar, Settings } from 'lucide-react';

const SlideOutMenu = ({
  isOpen,
  onClose,
  onShowResourceHub,
  onShowAttendanceLogger,
  onShowWhiteboard,
  onShowBrowser,
  onShowTimer,
  onShowClassContext,
  onShowDashboard,
  onShowSchedule,
  onOpenSettings
}: any) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[150] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transitionDuration: 'var(--motion-slow)',
          transitionTimingFunction: 'var(--ease-zen)',
        }}
        onClick={onClose}
      />

      {/* Floating Menu Panel */}
      <div
        className={`fixed top-4 bottom-4 left-4 w-80 zen-card flex flex-col z-[160] overflow-hidden ${isOpen
            ? 'translate-x-0 opacity-100 scale-100'
            : '-translate-x-[120%] opacity-0 scale-95 pointer-events-none'
          }`}
        style={{
          transitionProperty: 'transform, opacity, filter',
          transitionDuration: 'var(--motion-slow)',
          transitionTimingFunction: 'var(--ease-zen)',
          borderRadius: '24px',
        }}
      >
        <div className="p-8 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-10 mt-2">
            <h2 className="text-h2 flex items-center gap-2">
              Genatis Board
            </h2>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full transition-all active:scale-95"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
              }}
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Menu Items */}
          <ul className="space-y-1 flex-1">
            {[
              { icon: Globe, label: 'Main Dashboard', action: onShowDashboard },
              { icon: Calendar, label: 'Schedule & Timetable', action: onShowSchedule },
              { icon: BookOpen, label: 'Context Intel', action: onShowClassContext },
              { icon: Folder, label: 'Resource Hub', action: onShowResourceHub },
              { icon: UserCheck, label: 'Attendance', action: onShowAttendanceLogger },
              { icon: PenTool, label: 'Whiteboard', action: onShowWhiteboard },
              { icon: Clock, label: 'Timer', action: onShowTimer },
              { icon: Settings, label: 'Settings & Setup', action: onOpenSettings },
            ].map((item: any, index: number) => (
              <li key={index}>
                <button
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all active:scale-[0.97] group"
                  style={{
                    color: 'var(--text-primary)',
                    transitionDuration: 'var(--motion-fast)',
                    transitionTimingFunction: 'var(--ease-zen)',
                  }}
                  onMouseEnter={(e: any) => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={(e: any) => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      background: 'var(--surface)',
                      transitionDuration: 'var(--motion-fast)',
                    }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
                  </div>
                  <span className="font-medium text-body">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;



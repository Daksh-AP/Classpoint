import React from 'react';
import { X, Folder, UserCheck, PenTool, Maximize, Globe, Calendar, Clock } from 'lucide-react';

const SlideOutMenu = ({ isOpen, onClose, onShowResourceHub, onShowAttendance, onShowAttendanceLogger, onShowWhiteboard, onShowBrowser, onShowTimer }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-500 ease-premium ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={`fixed inset-y-0 left-0 w-72 glass-card border-r border-dark-border transform transition-all duration-500 ease-premium z-60 ${isOpen
          ? 'translate-x-0 opacity-100 scale-100 blur-0'
          : '-translate-x-12 opacity-0 scale-95 blur-sm pointer-events-none'
          }`}
        style={{ zIndex: 60 }}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">
              Menu
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <ul className="space-y-2 flex-1">
            <li>
              <button
                onClick={() => {
                  onShowResourceHub();
                  onClose();
                }}
                className="nav-item w-full group"
              >
                <Folder className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Resource Hub</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onShowAttendanceLogger();
                  onClose();
                }}
                className="nav-item w-full group"
              >
                <Calendar className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Attendance</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onShowWhiteboard();
                  onClose();
                }}
                className="nav-item w-full group"
              >
                <PenTool className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Whiteboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onShowBrowser();
                  onClose();
                }}
                className="nav-item w-full group"
              >
                <Globe className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Browser</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onShowTimer();
                  onClose();
                }}
                className="nav-item w-full group"
              >
                <Clock className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Timer</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;

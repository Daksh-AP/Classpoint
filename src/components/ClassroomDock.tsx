import React, { useState, useEffect } from 'react';
import { PenTool, FolderOpen, Globe, UserCheck, Timer, ChevronUp, ChevronDown, Calendar, Settings, LayoutDashboard, Target, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTools } from '../context/ToolProvider';
import { useTimer } from '../contexts/TimerContext';
import { TimeService } from '../services/TimeService';

interface ClassroomDockProps {
  currentClass: any;
  nextClass?: any;
  isQuickGridActive?: boolean;
  activeView?: string;
  onOpenSchedule?: () => void;
  onOpenContext?: () => void;
  onOpenSettings?: () => void;
  onOpenDashboard?: () => void;
}

const ClassroomDock: React.FC<ClassroomDockProps> = ({ 
  currentClass, 
  nextClass, 
  isQuickGridActive = false,
  activeView = 'dashboard',
  onOpenSchedule,
  onOpenContext,
  onOpenSettings,
  onOpenDashboard
}) => {
  const { activeTool, openTool, closeTool } = useTools();
  const { duration, timeLeft, isActive, toggleTimer } = useTimer() as any;
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const dockRef = React.useRef<HTMLDivElement>(null);

  // In sub-screens or when tools are active, dock starts minimized unless explicitly opened by touch
  const isSubScreenOrTool = activeTool !== null || activeView !== 'dashboard';
  const isMinimized = isSubScreenOrTool && !isExpanded;

  // Touchscreen tap outside listener: Touching anywhere on canvas/screen immediately collapses dock
  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDownOutside = (e: PointerEvent | MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, { capture: true });
    };
  }, [isExpanded]);

  // When changing views or tools, collapse dock
  useEffect(() => {
    setIsExpanded(false);
  }, [activeView, activeTool]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => /* console.error */ (err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleDashboardClick = () => {
    setIsExpanded(false);
    closeTool();
    if (onOpenDashboard) {
      onOpenDashboard();
    }
  };

  useEffect(() => {
    if (!currentClass) return;
    const updateProgress = () => {
      const now = new Date();
      const start = TimeService.parseTime(currentClass.startTime);
      const end = TimeService.parseTime(currentClass.endTime);
      if (now < start) setProgress(0);
      else if (now > end) setProgress(100);
      else setProgress(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
    };
    updateProgress();
    const interval = setInterval(updateProgress, 30000);
    return () => clearInterval(interval);
  }, [currentClass]);

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  type DockItem = { id: string; icon: any, label: string; color: string; isAction: boolean; action?: () => void };
  const getDockItems = (): DockItem[] => {
    if (isQuickGridActive || activeView !== 'dashboard') {
      return [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#0A84FF', isAction: true, action: handleDashboardClick },
        { id: 'schedule', icon: Calendar, label: 'Schedule', color: '#BF5AF2', isAction: true, action: onOpenSchedule },
        { id: 'context', icon: Target, label: 'Class Context', color: '#30D158', isAction: true, action: onOpenContext },
        { id: 'fullscreen', icon: Maximize, label: 'Fullscreen', color: '#FF375F', isAction: true, action: toggleFullScreen },
        { id: 'settings', icon: Settings, label: 'Settings', color: '#FF9F0A', isAction: true, action: onOpenSettings },
      ];
    }
    
    return [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#0A84FF', isAction: true, action: handleDashboardClick },
      { id: 'schedule', icon: Calendar, label: 'Schedule', color: '#BF5AF2', isAction: true, action: onOpenSchedule },
      { id: 'timer', icon: Timer, label: 'Timer', color: '#FF9F0A', isAction: false },
      { id: 'whiteboard', icon: PenTool, label: 'Whiteboard', color: '#BF5AF2', isAction: false },
      { id: 'browser', icon: Globe, label: 'Browser', color: '#64D2FF', isAction: false },
      { id: 'attendanceLogger', icon: UserCheck, label: 'Attendance', color: '#30D158', isAction: false },
    ];
  };

  const dockItems = getDockItems();

  return (
    <motion.div
      ref={dockRef}
      className="fixed bottom-6 left-1/2 z-[200] flex flex-col items-center select-none touch-manipulation pointer-events-none"
      initial={{ y: 100, x: '-50%', opacity: 0 }}
      animate={{ 
        y: isMinimized ? 65 : 0, 
        x: '-50%', 
        opacity: isMinimized ? 0.35 : 1, 
        scale: isMinimized ? 0.9 : 1 
      }}
      exit={{ y: 100, x: '-50%', opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Touchscreen Peek Tab — Generous touch hit area */}
      {isMinimized && (
        <button 
          type="button"
          className="mb-3 bg-white/95 dark:bg-black/90 backdrop-blur-xl rounded-full px-6 py-2.5 flex items-center gap-2.5 pointer-events-auto cursor-pointer border border-black/10 dark:border-white/15 shadow-2xl active:scale-95 transition-transform" 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
        >
          <ChevronUp size={18} className="text-gray-800 dark:text-gray-100" />
          <span className="text-sm font-bold tracking-wide text-gray-800 dark:text-gray-100">Tools Dock</span>
        </button>
      )}

      {/* Main Dock Container */}
      <div 
        className={`bg-white/90 dark:bg-[#1A1A24]/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl shadow-black/15 pointer-events-auto ${
          isMinimized ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
        } transition-opacity duration-200`}
      >
        
        {/* Progress / Status Section */}
        <div className="flex flex-col justify-center px-4 py-2.5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 min-w-[140px]">
          {isActive ? (
            <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={toggleTimer}>
               <Timer size={18} className="text-[#FF9F0A]" />
               <span className="text-[#FF9F0A] font-bold font-mono text-lg">{formatTimeLeft(timeLeft)}</span>
            </div>
          ) : currentClass ? (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 font-semibold">
                <span className="truncate max-w-[75px]">{currentClass.subject}</span>
                <span>{currentClass.endTime}</span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#0A84FF] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold text-center">No Active Class</span>
          )}
        </div>

        <div className="w-[1px] h-10 bg-black/10 dark:bg-white/10 mx-1" />

        {/* Dock Touch Buttons */}
        <div className="flex items-center gap-2">
          {dockItems.map((item) => {
            const isActiveTool = !item.isAction && activeTool === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                  if (item.isAction && item.action) {
                    item.action();
                  } else {
                    openTool(item.id);
                  }
                }}
                className="relative min-w-[54px] min-h-[54px] p-3 rounded-xl flex items-center justify-center transition-all active:scale-90 active:bg-black/10 dark:active:bg-white/10"
                style={{
                  backgroundColor: isActiveTool ? `${item.color}25` : 'transparent',
                }}
              >
                {isActiveTool && (
                  <div
                    className="absolute -bottom-1 w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                
                <item.icon 
                  size={28} 
                  strokeWidth={isActiveTool ? 2.5 : 2}
                  style={{ color: isActiveTool ? item.color : '#6B7280' }}
                  className="drop-shadow-sm pointer-events-none"
                />
              </button>
            );
          })}

          {/* Quick Collapse Button for Touchscreens when expanded in sub-screens */}
          {isSubScreenOrTool && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-3 ml-1 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 active:scale-90 transition-all flex items-center justify-center"
              title="Minimize Dock"
            >
              <ChevronDown size={22} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ClassroomDock;

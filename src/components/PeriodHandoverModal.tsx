import React from 'react';
import { Bell, Clock, User, CheckCircle, X, PlusCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface PeriodHandoverModalProps {
  currentClass: {
    subject: string;
    startTime: string;
    endTime: string;
    teacher?: string;
    location?: string;
    room?: string;
    setNotice?: string;
    notice?: string;
  } | null;
  sectionName?: string;
  onConfirm: () => void;
  onExtend: () => void;
  onDismiss: () => void;
}

export default function PeriodHandoverModal({
  currentClass,
  sectionName,
  onConfirm,
  onExtend,
  onDismiss,
}: PeriodHandoverModalProps) {
  if (!currentClass) return null;

  const teacherName = currentClass.teacher || 'Scheduled Teacher';
  const noticeText = currentClass.setNotice || currentClass.notice;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] pointer-events-auto select-none max-w-2xl w-[94vw] sm:w-[90vw]">
      <motion.div
        initial={{ opacity: 0, y: -25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--accent)]/40 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 25px -5px var(--accent-soft)' }}
      >
        {/* Left Info: Icon & Class Details */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] flex-shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                Period Change
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                {currentClass.startTime} – {currentClass.endTime}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 truncate">
              <h4 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
                {currentClass.subject}
              </h4>
              <span className="text-xs text-[var(--text-secondary)] truncate">
                • {teacherName}
              </span>
            </div>

            {noticeText && (
              <p className="text-[11px] text-amber-500 font-medium truncate mt-0.5 flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{noticeText}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Actions: +5 Min Extension, Switch Now, Dismiss */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onExtend}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
            title="Extend current period by 5 minutes"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>+5m Extend</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-95 shadow-md shadow-[var(--accent)]/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Switch to {currentClass.subject}</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-all flex-shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

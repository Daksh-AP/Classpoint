import React from 'react';
import { Clock, MapPin, Calendar, Info } from 'lucide-react';
import { TimeService } from '../services/TimeService.js';
import { getSetRotationNotice } from '../utils/timetableNormalizer';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableDisplay = ({ timetableData, selectedSection, currentTime }: any) => {
  const sectionSchedule = timetableData?.sections?.[selectedSection.id] || {};
  const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

  const isCurrentClass = (classItem: any) => {
    if (currentDay !== classItem.day) return false;
    return TimeService.isCurrentTime(classItem.startTime, classItem.endTime);
  };

  const isUpcomingClass = (classItem: any) => {
    if (currentDay !== classItem.day) return false;
    return TimeService.isUpcoming(classItem.startTime);
  };

  const renderTimeSlot = (classItem: any, dayName: any) => {
    const isCurrent = isCurrentClass({ ...classItem, day: dayName });
    const isUpcoming = isUpcomingClass({ ...classItem, day: dayName });

    return (
      <div
        key={`${dayName}-${classItem.startTime}`}
        className="p-4 rounded-xl border transition-all duration-300 relative overflow-hidden"
        style={{
          background: isCurrent
            ? 'rgba(52, 199, 89, 0.08)'
            : 'var(--surface)',
          borderColor: isCurrent
            ? 'rgba(52, 199, 89, 0.35)'
            : 'var(--glass-border)',
          boxShadow: isCurrent
            ? '0 0 20px rgba(52, 199, 89, 0.08)'
            : 'none',
        }}
      >
        {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-xl" />}

        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4
              className="font-semibold text-body"
              style={{ color: isCurrent ? '#34C759' : 'var(--text-primary)' }}
            >
              {classItem.subject}
            </h4>
            {classItem.teacher && (
              <p className="text-small mt-0.5">{classItem.teacher}</p>
            )}
          </div>
          {isCurrent && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider rounded-full">
              Live
            </span>
          )}
          {isUpcoming && !isCurrent && (
            <span
              className="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Next
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 text-small">
          <span className="flex items-center font-mono" style={{ color: 'var(--text-secondary)' }}>
            <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
            {classItem.startTime} - {classItem.endTime}
          </span>
          {classItem.location && (
            <span className="flex items-center" style={{ color: 'var(--text-secondary)' }}>
              <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              {classItem.location}
            </span>
          )}
        </div>

        {(classItem.setNotice || getSetRotationNotice(classItem.subject)) && (
          <div className="mt-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{classItem.subject} Activity & Rotation Notice:</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed pl-5">
              {classItem.setNotice || getSetRotationNotice(classItem.subject)}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!timetableData || Object.keys(sectionSchedule).length === 0) {
    return (
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--surface)' }}
        >
          <Calendar className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-h3 mb-2">No Schedule Data</h3>
        <p className="text-small">
          No timetable data found for {selectedSection.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Today's Schedule Highlight */}
      <div
        className="zen-card-flat p-6 rounded-2xl"
        style={{ borderLeft: '3px solid var(--accent)' }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-h3">Today — {currentDay}</h3>
        </div>

        {sectionSchedule[currentDay] && sectionSchedule[currentDay].length > 0 ? (
          <div className="grid gap-4">
            {sectionSchedule[currentDay].map((classItem: any) =>
              renderTimeSlot(classItem, currentDay)
            )}
          </div>
        ) : (
          <p className="text-small italic">No classes scheduled for today</p>
        )}
      </div>

      {/* Weekly Overview */}
      <div className="grid gap-8">
        <h3
          className="text-h3 pl-3 border-l-4"
          style={{ borderColor: 'var(--accent)' }}
        >
          Weekly Schedule
        </h3>

        {DAYS.map((day: any) => (
          <div key={day} className="space-y-4">
            <div className="flex items-center space-x-3">
              <h4
                className="text-body font-semibold"
                style={{ color: day === currentDay ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                {day}
              </h4>
              {day === currentDay && (
                <span
                  className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  Today
                </span>
              )}
            </div>

            {sectionSchedule[day] && sectionSchedule[day].length > 0 ? (
              <div
                className="grid gap-3 pl-4 border-l-2 ml-2"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                {sectionSchedule[day].map((classItem: any) =>
                  renderTimeSlot(classItem, day)
                )}
              </div>
            ) : (
              <p className="text-small pl-6 italic opacity-50">No classes scheduled</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetableDisplay;

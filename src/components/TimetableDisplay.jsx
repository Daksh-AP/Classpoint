import React from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { TimeService } from '../services/TimeService.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableDisplay = ({ timetableData, selectedSection, currentTime }) => {
  const sectionSchedule = timetableData?.sections?.[selectedSection.id] || {};
  const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

  const isCurrentClass = (classItem) => {
    if (currentDay !== classItem.day) return false;
    return TimeService.isCurrentTime(classItem.startTime, classItem.endTime);
  };

  const isUpcomingClass = (classItem) => {
    if (currentDay !== classItem.day) return false;
    return TimeService.isUpcoming(classItem.startTime);
  };

  const renderTimeSlot = (classItem, dayName) => {
    const isCurrent = isCurrentClass({ ...classItem, day: dayName });
    const isUpcoming = isUpcomingClass({ ...classItem, day: dayName });
    const isToday = currentDay === dayName;

    return (
      <div
        key={`${dayName}-${classItem.startTime}`}
        className={`
          p-4 rounded-xl border transition-all duration-300 relative overflow-hidden
          ${isCurrent
            ? 'bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10'
            : isUpcoming && isToday
              ? 'bg-accent-500/10 border-accent-500/30 shadow-lg shadow-accent-500/10'
              : isToday
                ? 'bg-primary-500/5 border-primary-500/20'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
          }
        `}
      >
        {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}

        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className={`font-semibold text-lg ${isCurrent ? 'text-green-400' : isUpcoming ? 'text-accent-400' : 'text-slate-200'}`}>
              {classItem.subject}
            </h4>
            {classItem.teacher && (
              <p className="text-sm text-slate-400">
                {classItem.teacher}
              </p>
            )}
          </div>
          {isCurrent && (
            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-bold uppercase tracking-wider rounded-full">
              Live
            </span>
          )}
          {isUpcoming && isToday && !isCurrent && (
            <span className="px-2 py-1 bg-accent-500/20 text-accent-300 text-xs font-bold uppercase tracking-wider rounded-full">
              Next
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-slate-400 font-mono">
              <Clock className="w-4 h-4 mr-2 opacity-70" />
              {classItem.startTime} - {classItem.endTime}
            </span>
            {classItem.location && (
              <span className="flex items-center text-slate-400">
                <MapPin className="w-4 h-4 mr-2 opacity-70" />
                {classItem.location}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!timetableData || Object.keys(sectionSchedule).length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-2">
          No Schedule Data
        </h3>
        <p className="text-slate-500">
          No timetable data found for {selectedSection.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Day Highlight */}
      <div className="glass-card p-6 border-primary-500/30 bg-primary-500/5">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-primary-500/20">
            <Calendar className="w-5 h-5 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Today - {currentDay}</h3>
        </div>

        {sectionSchedule[currentDay] && sectionSchedule[currentDay].length > 0 ? (
          <div className="grid gap-4">
            {sectionSchedule[currentDay].map((classItem, index) =>
              renderTimeSlot(classItem, currentDay)
            )}
          </div>
        ) : (
          <p className="text-slate-400 italic">No classes scheduled for today</p>
        )}
      </div>

      {/* Weekly Overview */}
      <div className="grid gap-8">
        <h3 className="text-xl font-semibold text-slate-200 pl-2 border-l-4 border-primary-500">Weekly Schedule</h3>

        {DAYS.map(day => (
          <div key={day} className="space-y-4">
            <div className="flex items-center space-x-3">
              <h4 className={`text-lg font-medium ${day === currentDay ? 'text-primary-400' : 'text-slate-400'}`}>
                {day}
              </h4>
              {day === currentDay && (
                <span className="px-2 py-0.5 bg-primary-500/20 text-primary-300 text-xs font-bold uppercase tracking-wider rounded-full">
                  Today
                </span>
              )}
            </div>

            {sectionSchedule[day] && sectionSchedule[day].length > 0 ? (
              <div className="grid gap-3 pl-4 border-l border-white/10 ml-2">
                {sectionSchedule[day].map((classItem, index) =>
                  renderTimeSlot(classItem, day)
                )}
              </div>
            ) : (
              <p className="text-slate-600 pl-6 italic text-sm">No classes scheduled</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetableDisplay;

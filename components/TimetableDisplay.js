import React from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { TimeService } from '../services/TimeService';

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
          p-4 rounded-lg border transition-all duration-200
          ${isCurrent 
            ? 'bg-green-100 border-green-300 shadow-md ring-2 ring-green-400' 
            : isUpcoming && isToday
            ? 'bg-yellow-50 border-yellow-300 shadow-sm'
            : isToday
            ? 'bg-blue-50 border-blue-200'
            : 'bg-white border-gray-200'
          }
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className={`font-semibold ${isCurrent ? 'text-green-900' : 'text-gray-900'}`}>
              {classItem.subject}
            </h4>
            {classItem.teacher && (
              <p className={`text-sm ${isCurrent ? 'text-green-700' : 'text-gray-600'}`}>
                {classItem.teacher}
              </p>
            )}
          </div>
          {isCurrent && (
            <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
              Live
            </span>
          )}
          {isUpcoming && isToday && !isCurrent && (
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full">
              Next
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            <span className={`flex items-center ${isCurrent ? 'text-green-700' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {classItem.startTime} - {classItem.endTime}
            </span>
            {classItem.location && (
              <span className={`flex items-center ${isCurrent ? 'text-green-700' : 'text-gray-500'}`}>
                <MapPin className="w-4 h-4 mr-1" />
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
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Schedule Data
        </h3>
        <p className="text-gray-500">
          No timetable data found for {selectedSection.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Day Highlight */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-primary-900">Today - {currentDay}</h3>
        </div>
        
        {sectionSchedule[currentDay] && sectionSchedule[currentDay].length > 0 ? (
          <div className="grid gap-3">
            {sectionSchedule[currentDay].map((classItem, index) => 
              renderTimeSlot(classItem, currentDay)
            )}
          </div>
        ) : (
          <p className="text-primary-700">No classes scheduled for today</p>
        )}
      </div>

      {/* Weekly Overview */}
      <div className="grid gap-6">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
        
        {DAYS.map(day => (
          <div key={day} className="space-y-3">
            <div className="flex items-center space-x-2">
              <h4 className={`font-medium ${day === currentDay ? 'text-primary-600' : 'text-gray-700'}`}>
                {day}
              </h4>
              {day === currentDay && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                  Today
                </span>
              )}
            </div>
            
            {sectionSchedule[day] && sectionSchedule[day].length > 0 ? (
              <div className="grid gap-3 pl-4">
                {sectionSchedule[day].map((classItem, index) => 
                  renderTimeSlot(classItem, day)
                )}
              </div>
            ) : (
              <p className="text-gray-500 pl-4 py-4 italic">No classes scheduled</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetableDisplay;
import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Clock, User, BookOpen, MapPin } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TIME_SLOTS = [
  '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45'
];

const SECTIONS = [
  { id: 'super1', name: 'Super 1' },
  { id: 'super2', name: 'Super 2' },
  { id: 'super3', name: 'Super 3' },
  { id: 'whiz1', name: 'Whiz 1' },
  { id: 'whiz2', name: 'Whiz 2' },
  { id: 'whiz3', name: 'Whiz 3' },
];

const ManualTimetableEntry = ({ onSave, onCancel, selectedSection }) => {
  const [currentDay, setCurrentDay] = useState('Monday');
  const [timetableData, setTimetableData] = useState(() => {
    const initialData = { sections: {} };
    SECTIONS.forEach(section => {
      initialData.sections[section.id] = {};
      DAYS.forEach(day => {
        initialData.sections[section.id][day] = [];
      });
    });
    return initialData;
  });

  const [newClass, setNewClass] = useState({
    subject: '',
    teacher: '',
    location: '',
    startTime: '09:00',
    endTime: '09:45'
  });

  const [errors, setErrors] = useState({});

  const validateClass = (classData) => {
    const errors = {};
    
    if (!classData.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    
    if (!classData.teacher.trim()) {
      errors.teacher = 'Teacher name is required';
    }

    // Validate time
    const startMinutes = timeToMinutes(classData.startTime);
    const endMinutes = timeToMinutes(classData.endTime);
    
    if (endMinutes <= startMinutes) {
      errors.time = 'End time must be after start time';
    }

    // Check for time conflicts
    const daySchedule = timetableData.sections[selectedSection.id][currentDay];
    const hasConflict = daySchedule.some(existingClass => {
      const existingStart = timeToMinutes(existingClass.startTime);
      const existingEnd = timeToMinutes(existingClass.endTime);
      
      return (
        (startMinutes >= existingStart && startMinutes < existingEnd) ||
        (endMinutes > existingStart && endMinutes <= existingEnd) ||
        (startMinutes <= existingStart && endMinutes >= existingEnd)
      );
    });

    if (hasConflict) {
      errors.time = 'Time slot conflicts with existing class';
    }

    return errors;
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const addClass = () => {
    const validationErrors = validateClass(newClass);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedData = { ...timetableData };
    const daySchedule = [...updatedData.sections[selectedSection.id][currentDay]];
    
    daySchedule.push({ ...newClass });
    
    // Sort by start time
    daySchedule.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    updatedData.sections[selectedSection.id][currentDay] = daySchedule;
    setTimetableData(updatedData);
    
    // Reset form
    setNewClass({
      subject: '',
      teacher: '',
      location: '',
      startTime: '09:00',
      endTime: '09:45'
    });
    setErrors({});
  };

  const removeClass = (index) => {
    const updatedData = { ...timetableData };
    const daySchedule = [...updatedData.sections[selectedSection.id][currentDay]];
    daySchedule.splice(index, 1);
    updatedData.sections[selectedSection.id][currentDay] = daySchedule;
    setTimetableData(updatedData);
  };

  const handleSave = () => {
    const finalData = {
      ...timetableData,
      extractedText: 'Manually created timetable',
      subjects: getAllSubjects(),
      extractedAt: new Date().toISOString()
    };
    
    onSave(finalData);
  };

  const getAllSubjects = () => {
    const subjects = new Set();
    Object.values(timetableData.sections).forEach(section => {
      Object.values(section).forEach(daySchedule => {
        daySchedule.forEach(classItem => {
          if (classItem.subject) {
            subjects.add(classItem.subject);
          }
        });
      });
    });
    return Array.from(subjects);
  };

  const currentDaySchedule = timetableData.sections[selectedSection.id][currentDay];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-primary-600" />
            Manual Timetable Entry
          </h2>
          <div className="text-sm text-gray-500">
            Section: <span className="font-medium text-primary-600">{selectedSection.name}</span>
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex space-x-2 mb-6">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentDay === day
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Add New Class Form */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Class for {currentDay}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Subject *
              </label>
              <input
                type="text"
                value={newClass.subject}
                onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.subject ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Mathematics"
              />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Teacher *
              </label>
              <input
                type="text"
                value={newClass.teacher}
                onChange={(e) => setNewClass({ ...newClass, teacher: e.target.value })}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.teacher ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Dr. Smith"
              />
              {errors.teacher && <p className="text-red-500 text-xs mt-1">{errors.teacher}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={newClass.location}
                onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Room 101"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Time *
              </label>
              <div className="flex space-x-2">
                <select
                  value={newClass.startTime}
                  onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {TIME_SLOTS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <span className="self-center text-gray-500">to</span>
                <select
                  value={newClass.endTime}
                  onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {TIME_SLOTS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
            </div>
          </div>

          <button
            onClick={addClass}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Current Day Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {currentDay} Schedule ({currentDaySchedule.length} classes)
        </h3>

        {currentDaySchedule.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No classes scheduled for {currentDay}</p>
            <p className="text-sm">Add your first class using the form above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentDaySchedule.map((classItem, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{classItem.subject}</p>
                    <p className="text-sm text-gray-500">Subject</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{classItem.teacher}</p>
                    <p className="text-sm text-gray-500">Teacher</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{classItem.location || 'Not specified'}</p>
                    <p className="text-sm text-gray-500">Location</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{classItem.startTime} - {classItem.endTime}</p>
                    <p className="text-sm text-gray-500">Time</p>
                  </div>
                </div>
                <button
                  onClick={() => removeClass(index)}
                  className="ml-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Total classes: {Object.values(timetableData.sections[selectedSection.id]).reduce((total, day) => total + day.length, 0)}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Timetable</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualTimetableEntry;
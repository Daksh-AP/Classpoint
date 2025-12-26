import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Save, X, BookOpen, User, MapPin, Clock, Plus, ChevronDown, Check } from 'lucide-react';
import { SCHOOL_SUBJECTS, SCHOOL_TIMINGS } from '../utils/SchoolData.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Function to generate time slots based on SCHOOL_TIMINGS
const generateTimeSlots = () => {
  const slots = [];
  const start = new Date(`2000/01/01 ${SCHOOL_TIMINGS.start}`);
  const end = new Date(`2000/01/01 ${SCHOOL_TIMINGS.end}`);
  const interval = SCHOOL_TIMINGS.intervalMinutes;

  let currentTime = start;
  while (currentTime <= end) {
    slots.push(
      currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Use 24-hour format for internal consistency
      })
    );
    currentTime.setMinutes(currentTime.getMinutes() + interval);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label || value || placeholder;

  return (
    <div ref={dropdownRef}> {/* Removed relative and z-[999] */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border rounded-xl backdrop-blur-md text-left flex items-center justify-between transition-all duration-300 group outline-none ${isOpen
          ? 'bg-black/40 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
          : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'
          }`}
      >
        <div className="flex items-center text-gray-200">
          {Icon && <Icon className={`w-4 h-4 mr-2 transition-colors ${isOpen ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'}`} />}
          <span className={!value ? "text-gray-500" : ""}>{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      <div
        className={`absolute z-[999] w-full mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 origin-top ${isOpen
          ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
          }`}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full p-3 rounded-lg text-left flex items-center justify-between transition-all duration-200 ${value === option.value
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
            >
              <span>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ManualTimetableEntry = ({ onSave, onCancel, selectedSection, initialTimetable }) => {
  const [currentDay, setCurrentDay] = useState('Monday');
  const [timetableData, setTimetableData] = useState(() => {
    if (initialTimetable) {
      return initialTimetable;
    }
    const initialData = { sections: {} };
    initialData.sections[selectedSection.id] = {};
    DAYS.forEach(day => {
      initialData.sections[selectedSection.id][day] = [];
    });
    return initialData;
  });

  const [newClass, setNewClass] = useState({
    subject: '',
    teacher: '',
    location: '',
    startTime: SCHOOL_TIMINGS.start,
    endTime: TIME_SLOTS[TIME_SLOTS.indexOf(SCHOOL_TIMINGS.start) + 1] || SCHOOL_TIMINGS.end,
  });
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!TIME_SLOTS.includes(newClass.startTime)) {
      setNewClass(prev => ({ ...prev, startTime: SCHOOL_TIMINGS.start }));
    }
    if (!TIME_SLOTS.includes(newClass.endTime)) {
      setNewClass(prev => ({ ...prev, endTime: TIME_SLOTS[TIME_SLOTS.indexOf(SCHOOL_TIMINGS.start) + 1] || SCHOOL_TIMINGS.end }));
    }
  }, [selectedSection]);

  const availableSubjects = SCHOOL_SUBJECTS[selectedSection.grade] || [];

  const validateClass = (classData) => {
    const errors = {};
    const subjectToValidate = isCustomSubject ? customSubject : classData.subject;
    if (!subjectToValidate.trim()) errors.subject = 'Subject is required';
    if (!classData.teacher.trim()) errors.teacher = 'Teacher name is required';

    const startMinutes = timeToMinutes(classData.startTime);
    const endMinutes = timeToMinutes(classData.endTime);

    if (endMinutes <= startMinutes) errors.time = 'End time must be after start time';

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

    if (hasConflict) errors.time = 'Time slot conflicts with existing class';

    return errors;
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const addClass = () => {
    const subject = isCustomSubject ? customSubject.trim() : newClass.subject.trim();
    const classToAdd = { ...newClass, subject };
    const validationErrors = validateClass(classToAdd);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedData = { ...timetableData };
    if (!updatedData.sections[selectedSection.id]) updatedData.sections[selectedSection.id] = {};
    if (!updatedData.sections[selectedSection.id][currentDay]) updatedData.sections[selectedSection.id][currentDay] = [];

    const daySchedule = [...updatedData.sections[selectedSection.id][currentDay]];
    daySchedule.push(classToAdd);
    daySchedule.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    updatedData.sections[selectedSection.id][currentDay] = daySchedule;
    setTimetableData(updatedData);

    setNewClass({
      subject: '',
      teacher: '',
      location: '',
      startTime: SCHOOL_TIMINGS.start,
      endTime: TIME_SLOTS[TIME_SLOTS.indexOf(SCHOOL_TIMINGS.start) + 1] || SCHOOL_TIMINGS.end,
    });
    setIsCustomSubject(false);
    setCustomSubject('');
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
      extractedAt: new Date().toISOString(),
    };
    onSave(finalData);
  };

  const getAllSubjects = () => {
    const subjects = new Set();
    if (timetableData.sections[selectedSection.id]) {
      Object.values(timetableData.sections[selectedSection.id]).forEach(daySchedule => {
        daySchedule.forEach(classItem => {
          if (classItem.subject) subjects.add(classItem.subject);
        });
      });
    }
    return Array.from(subjects);
  };

  const currentDaySchedule = timetableData.sections[selectedSection.id]?.[currentDay] || [];

  return (
    <div className="relative z-[900]"> {/* Outer wrapper with high z-index for stacking context */}
      <div className="max-w-4xl mx-auto space-y-6 text-gray-200">

        {/* Header and Day Selector - within their own glass-card */}
        <div className="glass-card p-6 border border-white/10 bg-black/20 backdrop-blur-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <BookOpen className="w-6 h-6 mr-3 text-blue-400" />
              Manual Timetable Entry
            </h2>
            <div className="text-sm text-gray-400">
              Section: <span className="font-medium text-blue-400">{selectedSection.name}</span>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setCurrentDay(day)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${currentDay === day
                  ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50'
                  : 'bg-black/20 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Class Form - now directly under the main wrapper */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-visible z-[950]"> {/* Removed z-20, added overflow-visible and z-[950] */}
          <h3 className="font-semibold text-white flex items-center mb-6">
            <Plus className="w-5 h-5 mr-2 text-blue-400" />
            Add Class for {currentDay}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1.5" />
                Subject *
              </label>
              {isCustomSubject ? (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className={`w-full p-3 rounded-xl bg-black/20 border backdrop-blur-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none ${errors.subject ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  placeholder="Enter custom subject"
                />
              ) : (
                <CustomSelect
                  value={newClass.subject}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setIsCustomSubject(true);
                      setNewClass({ ...newClass, subject: '' });
                    } else {
                      setIsCustomSubject(false);
                      setNewClass({ ...newClass, subject: value });
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Subject' },
                    ...availableSubjects.map(s => ({ value: s, label: s })),
                    { value: 'custom', label: 'Custom Period' }
                  ]}
                  placeholder="Select Subject"
                />
              )}
              {errors.subject && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.subject}</p>}
              {isCustomSubject && (
                <button
                  onClick={() => {
                    setIsCustomSubject(false);
                    setNewClass({ ...newClass, subject: '' });
                    setCustomSubject('');
                  }}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Back to list
                </button>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <User className="w-4 h-4 inline mr-1.5" />
                Teacher *
              </label>
              <input
                type="text"
                value={newClass.teacher}
                onChange={(e) => setNewClass({ ...newClass, teacher: e.target.value })}
                className={`w-full p-3 rounded-xl bg-black/20 border backdrop-blur-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none ${errors.teacher ? 'border-red-500/50' : 'border-white/10'
                  }`}
                placeholder="e.g., Dr. Smith"
              />
              {errors.teacher && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.teacher}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <MapPin className="w-4 h-4 inline mr-1.5" />
                Location
              </label>
              <input
                type="text"
                value={newClass.location}
                onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                className="w-full p-3 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                placeholder="e.g., Room 101"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Clock className="w-4 h-4 inline mr-1.5" />
                Time *
              </label>
              <div className="flex space-x-3 items-center">
                <div className="flex-1">
                  <CustomSelect
                    value={newClass.startTime}
                    onChange={(value) => setNewClass({ ...newClass, startTime: value })}
                    options={TIME_SLOTS.map(t => ({ value: t, label: t }))}
                    placeholder="Start"
                  />
                </div>
                <span className="text-gray-500 font-medium">to</span>
                <div className="flex-1">
                  <CustomSelect
                    value={newClass.endTime}
                    onChange={(value) => setNewClass({ ...newClass, endTime: value })}
                    options={TIME_SLOTS.map(t => ({ value: t, label: t }))}
                    placeholder="End"
                  />
                </div>
              </div>
              {errors.time && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.time}</p>}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={addClass}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl shadow-lg shadow-blue-500/20 border border-blue-400/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Current Day Schedule */}
        <div className="glass-card p-6 border border-white/10 bg-black/20 backdrop-blur-xl rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
            {currentDay} Schedule
            <span className="ml-3 text-sm font-normal text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/5">
              {currentDaySchedule.length} classes
            </span>
          </h3>

          {currentDaySchedule.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">No classes scheduled for {currentDay}</p>
              <p className="text-sm text-gray-500 mt-1">Add your first class using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDaySchedule.map((classItem, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="font-medium text-white text-lg">{classItem.subject}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Subject</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{classItem.teacher}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Teacher</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 flex items-center">
                        <MapPin className="w-3 h-3 mr-1.5 text-gray-500" />
                        {classItem.location || 'Not specified'}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Location</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {classItem.startTime} - {classItem.endTime}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Time</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeClass(index)}
                    className="ml-6 p-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Remove class"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-gray-400">
            Total classes: <span className="text-white font-medium">{Object.values(timetableData.sections[selectedSection.id] || {}).reduce((total, day) => total + day.length, 0)}</span>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 px-8 py-3 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl shadow-lg shadow-green-500/20 border border-green-400/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-5 h-5" />
              <span>Save Timetable</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  );
};

export default ManualTimetableEntry;

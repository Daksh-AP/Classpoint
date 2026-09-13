import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Save, X, BookOpen, User, MapPin, Clock, Plus, ChevronDown, Check } from 'lucide-react';
import { AnimatedSelect } from './AnimatedSelect';
import { SCHOOL_SUBJECTS, SCHOOL_TIMINGS } from '../utils/SchoolData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Function to generate time slots based on SCHOOL_TIMINGS
const generateTimeSlots = () => {
  const slots = [];
  const start = new Date(`2000/01/01 ${SCHOOL_TIMINGS.start}`);
  const end = new Date(`2000/01/01 ${SCHOOL_TIMINGS.end}`);
  const interval = SCHOOL_TIMINGS.intervalMinutes;

  const currentTime = start;
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


const ManualTimetableEntry = ({ onSave, onCancel, selectedSection, initialTimetable }: any) => {
  const [currentDay, setCurrentDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(today) ? today : 'Monday';
  });
  const [timetableData, setTimetableData] = useState(() => {
    if (initialTimetable) {
      return initialTimetable;
    }
    const initialData: any= { sections: {} };
    initialData.sections[selectedSection.id] = {};
    DAYS.forEach((day: string) => {
      initialData.sections[selectedSection.id]![day] = [];
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

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!TIME_SLOTS.includes(newClass.startTime)) {
      setNewClass((prev: any) => ({ ...prev, startTime: SCHOOL_TIMINGS.start }));
    }
    if (!TIME_SLOTS.includes(newClass.endTime)) {
      setNewClass((prev: any) => ({ ...prev, endTime: TIME_SLOTS[TIME_SLOTS.indexOf(SCHOOL_TIMINGS.start) + 1] || SCHOOL_TIMINGS.end }));
    }
  }, [selectedSection]);

  const gradeNum = typeof selectedSection?.grade === 'string' ? Number(selectedSection.grade.replace(/\D/g, "")) : selectedSection?.grade;
  const availableSubjects = SCHOOL_SUBJECTS[gradeNum as keyof typeof SCHOOL_SUBJECTS] || [];

  const validateClass = (classData: any) => {
    const errors: any= {};
    const subjectToValidate = isCustomSubject ? customSubject : classData.subject;
    if (!subjectToValidate.trim()) errors.subject = 'Subject is required';
    if (!classData.teacher.trim()) errors.teacher = 'Teacher name is required';

    const startMinutes = timeToMinutes(classData.startTime);
    const endMinutes = timeToMinutes(classData.endTime);

    if (endMinutes <= startMinutes) errors.time = 'End time must be after start time';

    const daySchedule = timetableData.sections[selectedSection.id][currentDay];
    const hasConflict = daySchedule.some((existingClass: any) => {
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

  const timeToMinutes = (timeStr: any) => {
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
    daySchedule.sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

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

  const removeClass = (index: number) => {
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
      Object.values(timetableData.sections[selectedSection.id]).forEach((daySchedule: any) => {
        daySchedule.forEach((classItem: any) => {
          if (classItem.subject) subjects.add(classItem.subject);
        });
      });
    }
    return Array.from(subjects);
  };

  const currentDaySchedule = timetableData.sections[selectedSection.id]?.[currentDay] || [];

  return (
    <div className="relative z-[900] pb-32">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header and Day Selector */}
        <div className="zen-card-flat p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 flex items-center">
              <BookOpen className="w-6 h-6 mr-3 text-[var(--accent)]" />
              Manual Timetable Entry
            </h2>
            <div className="text-small">
              Section: <span className="font-medium text-[var(--accent)]">{selectedSection.name}</span>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
            {DAYS.map((day: any) => (
              <button
                key={day}
                onClick={() => setCurrentDay(day)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 border ${currentDay === day
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Class Form */}
        <div className="zen-card-flat p-6 rounded-2xl relative overflow-visible z-[950]">
          <h3 className="text-h3 flex items-center mb-6">
            <Plus className="w-5 h-5 mr-2 text-[var(--accent)]" />
            Add Class for {currentDay}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Subject */}
            <div>
              <label className="block text-small font-medium text-[var(--text-secondary)] mb-2">
                <BookOpen className="w-4 h-4 inline mr-1.5" />
                Subject *
              </label>
              {isCustomSubject ? (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e: any) => setCustomSubject(e.target.value)}
                  className={`zen-input w-full p-3 outline-none ${errors.subject ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Enter custom subject"
                />
              ) : (
                <AnimatedSelect
                  value={newClass.subject}
                  onChange={(value: any) => {
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
                    ...availableSubjects.map((s: any) => ({ value: s, label: s })),
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
                  className="mt-2 text-xs text-[var(--accent)] hover:opacity-80 hover:underline"
                >
                  Back to list
                </button>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-small font-medium text-[var(--text-secondary)] mb-2">
                <User className="w-4 h-4 inline mr-1.5" />
                Teacher *
              </label>
              <input
                type="text"
                value={newClass.teacher}
                onChange={(e: any) => setNewClass({ ...newClass, teacher: e.target.value })}
                className={`zen-input w-full p-3 outline-none ${errors.teacher ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="e.g., Dr. Smith"
              />
              {errors.teacher && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.teacher}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-small font-medium text-[var(--text-secondary)] mb-2">
                <MapPin className="w-4 h-4 inline mr-1.5" />
                Location
              </label>
              <input
                type="text"
                value={newClass.location}
                onChange={(e: any) => setNewClass({ ...newClass, location: e.target.value })}
                className="zen-input w-full p-3 outline-none"
                placeholder="e.g., Room 101"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-small font-medium text-[var(--text-secondary)] mb-2">
                <Clock className="w-4 h-4 inline mr-1.5" />
                Time *
              </label>
              <div className="flex space-x-3 items-center">
                <div className="flex-1">
                  <AnimatedSelect
                    value={newClass.startTime}
                    onChange={(value: any) => setNewClass({ ...newClass, startTime: value })}
                    options={TIME_SLOTS.map((t: any) => ({ value: t, label: t }))}
                    placeholder="Start"
                  />
                </div>
                <span className="text-[var(--text-secondary)] font-medium">to</span>
                <div className="flex-1">
                  <AnimatedSelect
                    value={newClass.endTime}
                    onChange={(value: any) => setNewClass({ ...newClass, endTime: value })}
                    options={TIME_SLOTS.map((t: any) => ({ value: t, label: t }))}
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
              className="zen-btn zen-btn-accent flex items-center space-x-2 px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Current Day Schedule */}
        <div className="zen-card-flat p-6 rounded-2xl md:min-h-[300px]">
          <h3 className="text-h3 mb-6 flex items-center">
            <span className="w-2 h-6 rounded-full mr-3" style={{ background: 'var(--accent)' }}></span>
            {currentDay} Schedule
            <span className="ml-3 text-small px-3 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              {currentDaySchedule.length} classes
            </span>
          </h3>

          {currentDaySchedule.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center" style={{ borderColor: 'var(--glass-border)', background: 'var(--surface)' }}>
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-body font-medium" style={{ color: 'var(--text-secondary)' }}>No classes scheduled for {currentDay}</p>
              <p className="text-small mt-1 opacity-70">Add your first class using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDaySchedule.map((classItem: any, index: number) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-5 rounded-xl transition-all duration-300 border mb-2"
                  style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
                  onMouseEnter={(e: any) => e.currentTarget.style.background = 'var(--glass-bg)'}
                  onMouseLeave={(e: any) => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-body font-semibold">{classItem.subject}</p>
                      <p className="text-label mt-1">Subject</p>
                    </div>
                    <div>
                      <p className="text-body">{classItem.teacher}</p>
                      <p className="text-label mt-1">Teacher</p>
                    </div>
                    <div>
                      <p className="text-body flex items-center">
                        <MapPin className="w-3 h-3 mr-1.5 opacity-70" />
                        {classItem.location || 'Not specified'}
                      </p>
                      <p className="text-label mt-1">Location</p>
                    </div>
                    <div>
                      <p className="text-body font-medium flex items-center text-[var(--accent)]">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {classItem.startTime} - {classItem.endTime}
                      </p>
                      <p className="text-label mt-1">Time</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeClass(index)}
                    className="ml-6 p-3 rounded-xl transition-all opacity-0 group-hover:opacity-100 text-zen-text-2 hover:text-red-500 hover:bg-red-500/10"
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
          <div className="text-small">
            Total classes: <span className="font-medium text-[var(--accent)]">{Object.values(timetableData.sections[selectedSection.id] || {}).reduce((total: number, day: any) => total + day.length, 0) as React.ReactNode}</span>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="zen-btn flex items-center space-x-2 px-8 py-3"
            >
              <X className="w-5 h-5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="zen-btn zen-btn-accent flex items-center space-x-2 px-8 py-3"
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

export const generateDemoTimetable = () => {
  const subjects = [
    'Mathematics',
    'English Literature', 
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Computer Science',
    'Art & Design',
    'Physical Education'
  ];

  const teachers = [
    'Dr. Smith',
    'Prof. Johnson',
    'Ms. Williams',
    'Mr. Brown',
    'Dr. Davis',
    'Ms. Miller',
    'Mr. Wilson',
    'Dr. Moore',
    'Ms. Taylor',
    'Mr. Anderson'
  ];

  const locations = [
    'Room 101',
    'Room 102',
    'Room 103',
    'Lab A',
    'Lab B',
    'Lab C',
    'Auditorium',
    'Library',
    'Gymnasium',
    'Art Studio'
  ];

  const timeSlots = [
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '09:45', end: '10:30' },
    { start: '10:30', end: '11:15' },
    { start: '11:30', end: '12:15' },
    { start: '13:00', end: '13:45' },
    { start: '13:45', end: '14:30' },
    { start: '14:30', end: '15:15' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const sections = ['super1', 'super2', 'super3', 'whiz1', 'whiz2', 'whiz3'];

  const timetableData = {
    sections: {},
    extractedText: 'Demo timetable data generated for testing',
    subjects: subjects,
    extractedAt: new Date().toISOString()
  };

  sections.forEach(sectionId => {
    timetableData.sections[sectionId] = {};
    
    days.forEach(day => {
      const daySchedule = [];
      const numClasses = Math.floor(Math.random() * 3) + 5; // 5-7 classes per day
      const usedTimeSlots = new Set();
      
      for (let i = 0; i < numClasses && usedTimeSlots.size < timeSlots.length; i++) {
        let timeSlotIndex;
        do {
          timeSlotIndex = Math.floor(Math.random() * timeSlots.length);
        } while (usedTimeSlots.has(timeSlotIndex));
        
        usedTimeSlots.add(timeSlotIndex);
        
        const timeSlot = timeSlots[timeSlotIndex];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const teacher = teachers[Math.floor(Math.random() * teachers.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        daySchedule.push({
          subject,
          teacher,
          location,
          startTime: timeSlot.start,
          endTime: timeSlot.end
        });
      }
      
      // Sort by start time
      daySchedule.sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      timetableData.sections[sectionId][day] = daySchedule;
    });
  });

  return timetableData;
};

export const generateCurrentDayDemo = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Generate a schedule that includes current time for demo purposes
  const schedule = [
    {
      subject: 'Mathematics',
      teacher: 'Dr. Smith',
      location: 'Room 101',
      startTime: '09:00',
      endTime: '09:45'
    },
    {
      subject: 'English Literature',
      teacher: 'Ms. Johnson',
      location: 'Room 102',
      startTime: '10:00',
      endTime: '10:45'
    },
    {
      subject: 'Physics',
      teacher: 'Dr. Brown',
      location: 'Lab A',
      startTime: '11:00',
      endTime: '11:45'
    },
    {
      subject: 'Chemistry',
      teacher: 'Prof. Davis',
      location: 'Lab B',
      startTime: '13:00',
      endTime: '13:45'
    },
    {
      subject: 'Biology',
      teacher: 'Ms. Wilson',
      location: 'Lab C',
      startTime: '14:00',
      endTime: '14:45'
    }
  ];

  // Adjust one class to be current and one to be next
  if (currentHour >= 9 && currentHour < 15) {
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${Math.floor(currentMinute / 15) * 15}`;
    const nextHour = currentHour + 1;
    const nextTimeStr = `${nextHour.toString().padStart(2, '0')}:00`;
    
    // Make current class
    schedule[0] = {
      ...schedule[0],
      startTime: currentTimeStr,
      endTime: `${currentHour.toString().padStart(2, '0')}:45`
    };
    
    // Make next class
    schedule[1] = {
      ...schedule[1],
      startTime: nextTimeStr,
      endTime: `${nextHour.toString().padStart(2, '0')}:45`
    };
  }

  return schedule;
};
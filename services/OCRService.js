import Tesseract from 'tesseract.js';

export class OCRService {
  static async extractTimetableData(file, onProgress) {
    try {
      // Initialize progress
      if (onProgress) onProgress(10);

      // Convert file to image URL
      const imageUrl = URL.createObjectURL(file);
      
      if (onProgress) onProgress(20);

      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text' && onProgress) {
              const progress = Math.min(90, 20 + (m.progress * 60));
              onProgress(progress);
            }
          }
        }
      );

      if (onProgress) onProgress(95);

      // Clean up the URL
      URL.revokeObjectURL(imageUrl);

      // Parse the extracted text
      const parsedData = this.parseExtractedText(text);
      
      if (onProgress) onProgress(100);

      return parsedData;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image. Please ensure the image is clear and contains readable text.');
    }
  }

  static parseExtractedText(text) {
    // This is a simplified parser - in a real application, you'd want more sophisticated parsing
    // based on the actual format of your timetables
    
    // const lines = text.split('\n').filter(line => line.trim().length > 0);
    const sections = {
      super1: {},
      super2: {},
      super3: {},
      whiz1: {},
      whiz2: {},
      whiz3: {}
    };

    // Sample parsing logic - this would need to be customized based on your timetable format
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      { start: '09:00', end: '09:45' },
      { start: '09:45', end: '10:30' },
      { start: '10:45', end: '11:30' },
      { start: '11:30', end: '12:15' },
      { start: '13:00', end: '13:45' },
      { start: '13:45', end: '14:30' },
      { start: '14:30', end: '15:15' }
    ];

    // Try to identify subjects and create a basic schedule
    const subjects = this.extractSubjects(text);
    
    // Generate sample data based on extracted subjects
    // In a real implementation, this would parse the actual timetable structure
    Object.keys(sections).forEach(sectionId => {
      days.forEach(day => {
        sections[sectionId][day] = this.generateDaySchedule(subjects, timeSlots);
      });
    });

    return {
      sections,
      extractedText: text,
      subjects: subjects,
      extractedAt: new Date().toISOString()
    };
  }

  static extractSubjects(text) {
    // Common subject patterns
    const subjectPatterns = [
      /mathematics?/gi,
      /english/gi,
      /science/gi,
      /history/gi,
      /geography/gi,
      /physics/gi,
      /chemistry/gi,
      /biology/gi,
      /computer/gi,
      /art/gi,
      /music/gi,
      /pe|physical education/gi,
      /literature/gi,
      /social studies/gi,
      /economics/gi,
      /psychology/gi,
      /philosophy/gi,
      /language/gi,
      /french/gi,
      /spanish/gi,
      /german/gi
    ];

    const foundSubjects = new Set();
    
    subjectPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          foundSubjects.add(this.capitalizeFirst(match.toLowerCase()));
        });
      }
    });

    // If no subjects found, provide default ones
    if (foundSubjects.size === 0) {
      return ['Mathematics', 'English', 'Science', 'History', 'Geography'];
    }

    return Array.from(foundSubjects);
  }

  static generateDaySchedule(subjects, timeSlots) {
    const schedule = [];
    const shuffledSubjects = [...subjects].sort(() => Math.random() - 0.5);
    
    // Generate 4-6 classes per day
    const classCount = Math.floor(Math.random() * 3) + 4;
    
    for (let i = 0; i < Math.min(classCount, timeSlots.length); i++) {
      const subject = shuffledSubjects[i % shuffledSubjects.length];
      const timeSlot = timeSlots[i];
      
      schedule.push({
        subject: subject,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        teacher: this.generateTeacherName(),
        location: this.generateLocation()
      });
    }

    return schedule;
  }

  static generateTeacherName() {
    const firstNames = ['Dr. Smith', 'Prof. Johnson', 'Ms. Williams', 'Mr. Brown', 'Dr. Davis', 'Ms. Miller'];
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  }

  static generateLocation() {
    const locations = ['Room 101', 'Room 102', 'Lab A', 'Lab B', 'Auditorium', 'Library', 'Gym'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  static capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Method to handle different file types
  static async preprocessFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (file.type === 'application/pdf') {
          // For PDF files, you'd need a PDF to image conversion library
          // For now, we'll reject PDFs and suggest using images
          reject(new Error('PDF processing not implemented. Please convert to JPG/PNG first.'));
        } else {
          resolve(e.target.result);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
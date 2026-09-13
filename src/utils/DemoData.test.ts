import { generateDemoTimetable, generateCurrentDayDemo } from './DemoData';

describe('DemoData utility', () => {
    it('should generate a valid timetable structure', () => {
        const data = generateDemoTimetable();
        expect(data).toBeDefined();
        expect(data.sections).toBeDefined();
        expect(data.subjects.length).toBeGreaterThan(0);
        expect(data.extractedText).toContain('Demo timetable');
    });

    it('should generate sections with days containing classes', () => {
        const data = generateDemoTimetable();
        const firstSectionKeys = Object.keys(data.sections);
        expect(firstSectionKeys.length).toBeGreaterThan(0);
        
        const firstSectionId = firstSectionKeys[0];
        const days = Object.keys(data.sections[firstSectionId!] || {});
        expect(days).toContain('Monday');
        
        const mondayClasses = data.sections[firstSectionId!]?.['Monday'];
        expect(mondayClasses).toBeDefined();
        expect(mondayClasses?.length).toBeGreaterThanOrEqual(1);
        
        const firstClass = mondayClasses?.[0];
        expect(firstClass).toHaveProperty('subject');
        expect(firstClass).toHaveProperty('teacher');
        expect(firstClass).toHaveProperty('location');
        expect(firstClass).toHaveProperty('startTime');
        expect(firstClass).toHaveProperty('endTime');
    });

    it('should generate current day demo schedule', () => {
        const schedule = generateCurrentDayDemo();
        expect(schedule).toBeDefined();
        expect(Array.isArray(schedule)).toBe(true);
        expect(schedule.length).toBeGreaterThan(0);
        
        const firstClass = schedule[0];
        expect(firstClass).toHaveProperty('subject');
        expect(firstClass).toHaveProperty('startTime');
    });
});

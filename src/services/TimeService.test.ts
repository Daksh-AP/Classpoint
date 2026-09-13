import { TimeService } from './TimeService';

describe('TimeService', () => {
    it('should format time correctly', () => {
        const d1 = new Date();
        d1.setHours(9, 30, 0);
        expect(TimeService.formatTime(d1)).toBe('09:30');
    });

    it('should parse time to minutes', () => {
        expect(TimeService.timeToMinutes('09:30')).toBe(570);
        expect(TimeService.timeToMinutes('14:00')).toBe(840);
    });

    it('should calculate time remaining', () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        const timeStr = `${now.getHours()}:${now.getMinutes()}`;
        expect(TimeService.getTimeRemaining(timeStr)).toContain('min');
    });
});

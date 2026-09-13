import { paths } from './paths';

describe('Firestore Paths Utility', () => {
    it('generates the correct user path', () => {
        expect(paths.user('user123')).toBe('users/user123');
    });

    it('generates the correct section path', () => {
        expect(paths.section('8', 'math101')).toBe('schools/default_school/grades/grade8/sections/math101');
    });

    it('generates the correct attendance document path', () => {
        expect(paths.attendanceDoc('10', 'sci202', '2023-10-15')).toBe('schools/default_school/grades/grade10/sections/sci202/attendance/2023-10-15');
    });

    it('generates the correct parent chat messages path', () => {
        expect(paths.chatMessages('chat_abc')).toBe('schools/default_school/parentChats/chat_abc/messages');
    });
});

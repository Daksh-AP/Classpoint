import * as admin from 'firebase-admin';
admin.initializeApp();

// Export all auth functions
export * from './src/auth/customToken';

// Export all trigger functions
export * from './src/triggers/attendance';
export * from './src/triggers/system';

export { parseCSVWithAIV2 } from './src/ai/parseCSV';
export { parseTimetableWithAI } from './src/ai/parseTimetable';

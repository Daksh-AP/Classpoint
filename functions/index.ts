import * as admin from 'firebase-admin';
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export all auth functions
export * from './src/auth/customToken';

// Export all trigger functions
export * from './src/triggers/attendance';
export * from './src/triggers/system';

export { parseCSVWithAIV2 } from './src/ai/parseCSV';
export { parseTimetableWithAI } from './src/ai/parseTimetable';

export * from './src/jobs/databaseCleanup';
export * from './src/triggers/stats';
export * from './src/media/r2Service';
export * from './src/notifications/pushDispatcher';

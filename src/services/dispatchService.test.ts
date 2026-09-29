import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMorningDispatchRoutine, DispatchCache } from './dispatchService';

describe('Category 5 - Test 2: Zero-Connectivity Dispatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes 7:30 AM proxy routine strictly against local disk cache without throwing', async () => {
    // 1. Mock complete network disconnection (airplane mode / dead Wi-Fi)
    vi.stubGlobal('navigator', { onLine: false });
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ENOTFOUND: Network unreachable'));

    // 2. Local Roster & Absence Data cached on disk
    const mockLocalRoster: DispatchCache = {
      schoolId: 'SCH-9021',
      date: '2026-09-30',
      teachers: [
        { id: 'T-1', name: 'John Doe', historicalProxyCount: 2, qualifiedSubjects: ['Physics'], maxDailyPeriods: 5 },
        { id: 'T-2', name: 'Jane Smith', historicalProxyCount: 0, qualifiedSubjects: ['Physics'], maxDailyPeriods: 5 }
      ],
      absentTeacherIds: ['T-1']
    };

    // 3. Trigger morning dispatch routine
    const result = await executeMorningDispatchRoutine(mockLocalRoster);

    // 4. Assert offline dispatch succeeded, assigned substitute, and stored local outbox sync
    expect(result.status).toBe('OFFLINE_SUCCESS');
    expect(result.source).toBe('LOCAL_MIRROR_CACHE');
    expect(result.assignedSubstitutes.length).toBe(1);
    expect(result.assignedSubstitutes[0].substituteTeacherId).toBe('T-2');
    expect(result.pendingCloudSyncEntries).toBeGreaterThan(0);
  });
});

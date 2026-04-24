import {
  sanitizeGroupsInput,
  parseListPagination,
  buildEmergencyListQueries,
} from '../../routes/emergencies/helpers';
import {
  parseDevicesPagination,
  buildGroupCodes,
  buildPushTokenUpdatePlan,
  buildRegistrationDevicePayload,
} from '../../routes/devices/helpers';
import {
  isValidAdminRole,
  parsePagination,
  buildEmergencySummary,
  withNotificationSummaryDefaults,
} from '../../routes/admin/helpers';

describe('helpers unit tests', () => {
  describe('emergencies/helpers', () => {
    it('sanitizes and normalizes group input', () => {
      expect(sanitizeGroupsInput(' wil26, swa11 ')).toBe('WIL26,SWA11');
    });

    it('rejects invalid groups', () => {
      expect(() => sanitizeGroupsInput('A,$B')).toThrow('INVALID_GROUPS_FORMAT');
    });

    it('parses pagination with sane defaults', () => {
      expect(parseListPagination(undefined, undefined)).toEqual({ page: 1, limit: 50, offset: 0 });
      expect(parseListPagination('2', '10')).toEqual({ page: 2, limit: 10, offset: 10 });
    });

    it('builds queries for emergency number including inactive entries', () => {
      const q = buildEmergencyListQueries(true, 'E-100');
      expect(q.countQuery).toContain('emergency_number = ?');
      expect(q.countQuery).not.toContain('active = 1');
      expect(q.countParams).toEqual(['E-100']);
    });
  });

  describe('devices/helpers', () => {
    it('builds group code csv from mixed row shapes', () => {
      expect(buildGroupCodes([{ group_code: 'A' }, { code: 'B' }, { code: '' }])).toBe('A,B');
      expect(buildGroupCodes([])).toBeNull();
    });

    it('returns push token update plan for provided tokens only', () => {
      expect(buildPushTokenUpdatePlan('fcm', null)).toEqual({
        updates: ['fcm_token = ?'],
        params: ['fcm'],
      });
      expect(buildPushTokenUpdatePlan(undefined, undefined)).toEqual({
        updates: [],
        params: [],
      });
    });

    it('creates registration payload with leadership fallback', () => {
      const payload = buildRegistrationDevicePayload({
        existingId: 'd1',
        deviceToken: 'dt',
        registrationToken: 'rt',
        platform: 'android',
        registeredAt: '2026-01-01T00:00:00.000Z',
      });
      expect(payload.active).toBe(true);
      expect(payload.leadershipRole).toBe('none');
    });

    it('parses devices pagination with max limit cap', () => {
      expect(parseDevicesPagination('1', '999').limit).toBe(200);
    });
  });

  describe('admin/helpers', () => {
    it('validates admin roles and parses pagination', () => {
      expect(isValidAdminRole('admin')).toBe(true);
      expect(isValidAdminRole('viewer')).toBe(false);
      expect(parsePagination('3', '15', 100, 20)).toEqual({ page: 3, limit: 15, offset: 30 });
    });

    it('builds emergency response summary counts', () => {
      const summary = buildEmergencySummary([
        { id: '1', deviceId: 'd1', platform: 'android', participating: true, respondedAt: 'x', responder: {} as never },
        { id: '2', deviceId: 'd2', platform: 'ios', participating: false, respondedAt: 'x', responder: {} as never },
      ]);
      expect(summary).toEqual({ totalResponses: 2, participants: 1, nonParticipants: 1 });
    });

    it('fills missing notification summary fields with defaults', () => {
      expect(withNotificationSummaryDefaults({ delivered: 3 })).toEqual({
        total: 0,
        delivered: 3,
        failed: 0,
        pending: 0,
      });
    });
  });
});

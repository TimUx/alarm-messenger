import 'package:alarm_messenger/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('models', () {
    test('Emergency JSON roundtrip works', () {
      final emergency = Emergency(
        id: 'e1',
        emergencyNumber: 'E-001',
        emergencyDate: '2026-01-01T10:00:00.000Z',
        emergencyKeyword: 'BRAND',
        emergencyDescription: 'Kellerbrand',
        emergencyLocation: 'Hauptstrasse 1',
        createdAt: '2026-01-01T10:00:01.000Z',
        active: true,
        groups: 'WIL26,SWA11',
      );

      final parsed = Emergency.fromJson(emergency.toJson());
      expect(parsed.emergencyNumber, 'E-001');
      expect(parsed.groups, 'WIL26,SWA11');
      expect(parsed.active, isTrue);
    });

    test('Device fullName and hasName logic works', () {
      final deviceWithNames = Device(
        id: 'd1',
        deviceToken: 'dt',
        registrationToken: 'rt',
        platform: 'android',
        registeredAt: '2026-01-01T10:00:00.000Z',
        active: true,
        firstName: 'Max',
        lastName: 'Muster',
      );
      expect(deviceWithNames.fullName, 'Max Muster');
      expect(deviceWithNames.hasName, isTrue);

      final deviceWithoutNames = Device(
        id: 'd2',
        deviceToken: 'dt2',
        registrationToken: 'rt2',
        platform: 'ios',
        registeredAt: '2026-01-01T10:00:00.000Z',
        active: true,
      );
      expect(deviceWithoutNames.fullName, 'Unbekannt');
      expect(deviceWithoutNames.hasName, isFalse);
    });

    test('Qualifications list contains only active qualifications', () {
      final q = Qualifications(machinist: true, agt: false, paramedic: true);
      expect(q.getQualificationsList(), ['Maschinist', 'Sanitäter']);
    });

    test('PushNotificationData converts to active emergency', () {
      final push = PushNotificationData(
        emergencyId: 'e-push-1',
        emergencyNumber: 'E-PUSH-1',
        emergencyDate: '2026-01-01T10:00:00.000Z',
        emergencyKeyword: 'UNFALL',
        emergencyDescription: 'Verkehrsunfall',
        emergencyLocation: 'B1',
        groups: 'WIL26',
      );

      final emergency = push.toEmergency();
      expect(emergency.id, 'e-push-1');
      expect(emergency.active, isTrue);
      expect(emergency.groups, 'WIL26');
    });
  });
}

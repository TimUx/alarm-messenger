import 'package:alarm_messenger/models/models.dart';
import 'package:alarm_messenger/services/storage_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await StorageService.init();
  });

  group('StorageService', () {
    test('persists registration values and reports registered', () async {
      expect(StorageService.isRegistered(), isFalse);

      await StorageService.setDeviceToken('device-token-1');
      await StorageService.setDeviceId('device-id-1');
      await StorageService.setServerUrl('https://alarm.example.org');

      expect(StorageService.getDeviceToken(), 'device-token-1');
      expect(StorageService.getDeviceId(), 'device-id-1');
      expect(StorageService.getServerUrl(), 'https://alarm.example.org');
      expect(StorageService.isRegistered(), isTrue);
    });

    test('stores and restores emergency cache', () async {
      final emergencies = [
        Emergency(
          id: 'e1',
          emergencyNumber: 'E-001',
          emergencyDate: '2026-01-01T10:00:00.000Z',
          emergencyKeyword: 'BRAND',
          emergencyDescription: 'Kellerbrand',
          emergencyLocation: 'Hauptstrasse 1',
          createdAt: '2026-01-01T10:00:01.000Z',
          active: true,
        ),
      ];

      await StorageService.setEmergencyCache(emergencies);
      final cache = StorageService.getEmergencyCache();

      expect(cache, isNotNull);
      expect(cache!.first['emergencyNumber'], 'E-001');
    });

    test('clear removes persisted values', () async {
      await StorageService.setDeviceToken('device-token-1');
      await StorageService.clear();
      expect(StorageService.getDeviceToken(), isNull);
      expect(StorageService.isRegistered(), isFalse);
    });
  });
}

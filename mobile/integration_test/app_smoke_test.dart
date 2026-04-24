import 'package:alarm_messenger/l10n/strings.dart';
import 'package:alarm_messenger/models/models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('integration smoke: core models and localization constants', (tester) async {
    final push = PushNotificationData(
      emergencyId: 'e-int-1',
      emergencyNumber: 'E-INT-001',
      emergencyDate: '2026-01-01T10:00:00.000Z',
      emergencyKeyword: 'FEUER',
      emergencyDescription: 'Brandmeldeanlage',
      emergencyLocation: 'Wache 1',
    );

    final emergency = push.toEmergency();
    expect(emergency.active, isTrue);
    expect(emergency.emergencyKeyword, 'FEUER');
    expect(AppStrings.noConnection, isNotEmpty);
    expect(AppStrings.registrationSuccess, contains('Erfolgreich'));
  });
}

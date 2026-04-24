import 'package:alarm_messenger/l10n/strings.dart';
import 'package:alarm_messenger/main.dart';
import 'package:alarm_messenger/models/models.dart';
import 'package:alarm_messenger/providers/app_state.dart';
import 'package:alarm_messenger/providers/theme_provider.dart';
import 'package:alarm_messenger/services/notification_service.dart';
import 'package:alarm_messenger/services/storage_service.dart';
import 'package:alarm_messenger/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('integration smoke: logic (no app shell)', () {
    testWidgets('core models and localization constants', (tester) async {
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
  });

  group('integration smoke: app shell (Linux / desktop target)', () {
    setUpAll(() async {
      await StorageService.init();
      await NotificationService.initialize();
    });

    setUp(() async {
      await StorageService.clear();
    });

    testWidgets('shows registration flow when not registered', (tester) async {
      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => ThemeProvider()),
            ChangeNotifierProvider(create: (_) => AppState()),
          ],
          child: const AlarmMessengerApp(),
        ),
      );

      await tester.pump();
      // AppState._checkRegistration is async; allow spin-up without hanging on endless animations.
      var foundManual = false;
      for (var i = 0; i < 60; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        if (find.text('Manuell').evaluate().isNotEmpty) {
          foundManual = true;
          break;
        }
      }
      expect(foundManual, isTrue, reason: 'Registration screen should show manual tab');
      expect(find.text('Alarm Messenger'), findsWidgets);
      expect(find.text('QR-Code'), findsOneWidget);
      await tester.tap(find.text('Manuell'));
      for (var j = 0; j < 20; j++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(find.text('Registrieren'), findsOneWidget);
    });

    testWidgets('Material 3 theme is applied in app shell', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: ThemeMode.light,
          home: const Scaffold(
            body: Center(child: Text('theme probe')),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));
      final context = tester.element(find.text('theme probe'));
      expect(Theme.of(context).useMaterial3, isTrue);
      expect(Theme.of(context).colorScheme.primary, isNot(equals(Colors.transparent)));
    });
  });
}

import 'package:alarm_messenger/providers/theme_provider.dart';
import 'package:alarm_messenger/services/storage_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await StorageService.init();
  });

  testWidgets('theme provider toggles and notifies listeners', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => ThemeProvider(),
        child: MaterialApp(
          home: Consumer<ThemeProvider>(
            builder: (context, theme, _) => Scaffold(
              body: Column(
                children: [
                  Text('mode:${theme.themeMode.name}'),
                  ElevatedButton(
                    onPressed: theme.toggleTheme,
                    child: const Text('toggle'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('mode:system'), findsOneWidget);

    await tester.tap(find.text('toggle'));
    await tester.pump();
    expect(find.text('mode:light'), findsOneWidget);

    await tester.tap(find.text('toggle'));
    await tester.pump();
    expect(find.text('mode:dark'), findsOneWidget);

    await tester.tap(find.text('toggle'));
    await tester.pump();
    expect(find.text('mode:system'), findsOneWidget);
  });
}

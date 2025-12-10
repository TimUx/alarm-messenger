import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/app_state.dart';
import 'providers/theme_provider.dart';
import 'screens/registration_screen.dart';
import 'screens/home_screen.dart';
import 'screens/emergency_alert_screen.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize storage service
  await StorageService.init();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const AlarmMessengerApp(),
    ),
  );
}

class AlarmMessengerApp extends StatelessWidget {
  const AlarmMessengerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final appState = Provider.of<AppState>(context);
    
    return MaterialApp(
      title: 'Alarm Messenger',
      theme: ThemeData.light(useMaterial3: true),
      darkTheme: ThemeData.dark(useMaterial3: true),
      themeMode: themeProvider.themeMode,
      home: appState.isRegistered ? const HomeScreen() : const RegistrationScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

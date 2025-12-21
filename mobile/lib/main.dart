import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/app_state.dart';
import 'providers/theme_provider.dart';
import 'screens/registration_screen.dart';
import 'screens/home_screen.dart';
import 'services/storage_service.dart';
import 'services/notification_service.dart';
import 'services/websocket_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize storage service
  await StorageService.init();
  
  // Initialize notification service
  await NotificationService.initialize();
  
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

class AlarmMessengerApp extends StatefulWidget {
  const AlarmMessengerApp({super.key});

  @override
  State<AlarmMessengerApp> createState() => _AlarmMessengerAppState();
}

class _AlarmMessengerAppState extends State<AlarmMessengerApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // When app comes to foreground, ensure WebSocket is connected
      WebSocketService.ensureConnected();
    }
  }

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

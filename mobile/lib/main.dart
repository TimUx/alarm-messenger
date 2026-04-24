import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/app_state.dart';
import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';
import 'screens/registration_screen.dart';
import 'services/notification_service.dart';
import 'services/storage_service.dart';
import 'services/websocket_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await StorageService.init();

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
  StreamSubscription<Uri>? _appLinkSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initAppLinks());
  }

  Future<void> _initAppLinks() async {
    if (!mounted) return;
    final appState = context.read<AppState>();
    final appLinks = AppLinks();
    try {
      final initial = await appLinks.getInitialLink();
      if (initial != null) {
        _dispatchDeepLink(appState, initial);
      }
    } catch (_) {}
    _appLinkSubscription = appLinks.uriLinkStream.listen((uri) {
      _dispatchDeepLink(appState, uri);
    });
  }

  void _dispatchDeepLink(AppState appState, Uri uri) {
    if (uri.scheme == 'alarm-messenger' && uri.host == 'register') {
      final token = uri.queryParameters['token'];
      final server = uri.queryParameters['server'];
      if (token != null &&
          token.isNotEmpty &&
          server != null &&
          server.isNotEmpty) {
        appState.setPendingRegistrationInvite(
          server: server,
          token: token,
        );
      }
      return;
    }
    if (uri.scheme == 'https' || uri.scheme == 'http') {
      final path = uri.path.toLowerCase();
      if ((path == '/register' || path.endsWith('/register')) &&
          uri.queryParameters.containsKey('token')) {
        final token = uri.queryParameters['token']!;
        if (token.isNotEmpty) {
          appState.setPendingRegistrationInvite(
            server: uri.origin,
            token: token,
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _appLinkSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      WebSocketService().ensureConnected();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final appState = Provider.of<AppState>(context);

    return MaterialApp(
      title: 'Alarm Messenger',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeProvider.themeMode,
      home: appState.isInitializing
          ? Builder(
              builder: (context) {
                final scheme = Theme.of(context).colorScheme;
                return Scaffold(
                  body: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.emergency,
                          size: 64,
                          color: scheme.error,
                        ),
                        const SizedBox(height: 24),
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(
                          'Alarm Messenger',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            )
          : appState.isRegistered ? const HomeScreen() : const RegistrationScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

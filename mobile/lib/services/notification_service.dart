import 'dart:developer' as developer;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    try {
      // Android initialization
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

      // iOS initialization with detailed settings
      final iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
        requestCriticalPermission: true,
        onDidReceiveLocalNotification: (id, title, body, payload) async {
          developer.log(
            'iOS Local notification received: $title',
            name: 'NotificationService',
          );
        },
      );

      final initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _notifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (details) {
          developer.log(
            'Notification tapped: ${details.payload}',
            name: 'NotificationService',
          );
        },
      );

      // Request permissions for iOS
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await _requestIOSPermissions();
      }

      _initialized = true;
      developer.log('NotificationService initialized', name: 'NotificationService');
    } catch (e) {
      developer.log(
        'Error initializing NotificationService',
        name: 'NotificationService',
        error: e,
      );
    }
  }

  static Future<void> _requestIOSPermissions() async {
    final result = await _notifications
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
          critical: true,
        );

    developer.log(
      'iOS notification permissions granted: $result',
      name: 'NotificationService',
    );
  }

  static Future<void> showEmergencyNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) {
      await initialize();
    }

    try {
      // Android notification details
      const androidDetails = AndroidNotificationDetails(
        'emergency_channel',
        'Emergency Alerts',
        channelDescription: 'Critical emergency notifications',
        importance: Importance.max,
        priority: Priority.max,
        showWhen: true,
        enableVibration: true,
        playSound: true,
        // Make it full screen on lock screen
        fullScreenIntent: true,
        category: AndroidNotificationCategory.alarm,
        visibility: NotificationVisibility.public,
      );

      // iOS notification details - critical for bypassing Do Not Disturb
      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        sound: 'alarm.wav', // You'll need to add this to iOS assets
        interruptionLevel: InterruptionLevel.critical,
        // Show notification even when app is in foreground
        presentList: true,
        presentBanner: true,
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _notifications.show(
        0, // notification id
        title,
        body,
        details,
        payload: payload,
      );

      developer.log(
        'Emergency notification shown: $title',
        name: 'NotificationService',
      );
    } catch (e) {
      developer.log(
        'Error showing notification',
        name: 'NotificationService',
        error: e,
      );
    }
  }

  static Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  static Future<void> cancel(int id) async {
    await _notifications.cancel(id);
  }
}

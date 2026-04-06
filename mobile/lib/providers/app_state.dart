import 'dart:async';
import 'dart:developer' as developer;
import 'dart:io';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/alarm_service.dart';
import '../services/notification_service.dart';

class AppState extends ChangeNotifier {
  bool _isRegistered = false;
  Emergency? _currentEmergency;
  bool _showAlarmDialog = false;
  List<Emergency> _emergencies = [];
  bool _isLoading = false;
  String? _errorMessage;
  ServerInfo? _serverInfo;
  DeviceDetails? _deviceDetails;

  AppState() {
    _checkRegistration();
    _initializeWebSocket();
  }

  bool get isRegistered => _isRegistered;
  Emergency? get currentEmergency => _currentEmergency;
  bool get showAlarmDialog => _showAlarmDialog;
  List<Emergency> get emergencies => _emergencies;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  ServerInfo? get serverInfo => _serverInfo;
  DeviceDetails? get deviceDetails => _deviceDetails;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> _checkRegistration() async {
    _isRegistered = StorageService.isRegistered();
    if (_isRegistered) {
      final serverUrl = StorageService.getServerUrl();
      if (serverUrl != null) {
        ApiService.setBaseUrl(serverUrl);
        // Load server info and device details on startup
        await _loadServerInfo();
        await _loadDeviceDetails();
        // Load emergencies to check if there's a current one
        await loadEmergencies();
        // Check if there's an active emergency to show
        _checkForActiveEmergency();
      }
    }
    notifyListeners();
  }

  void _checkForActiveEmergency() {
    // Find the most recent active emergency
    final activeEmergencies = _emergencies.where((e) => e.active).toList();
    if (activeEmergencies.isEmpty) {
      return;
    }

    // Parse dates once for sorting
    final emergenciesWithDates = <({Emergency emergency, DateTime date})>[];
    
    for (final e in activeEmergencies) {
      try {
        final date = DateTime.parse(e.emergencyDate);
        emergenciesWithDates.add((emergency: e, date: date));
      } catch (error) {
        // Log error but continue processing other emergencies
        developer.log(
          'CRITICAL: Error parsing emergency date for ${e.id}: ${e.emergencyDate}',
          name: 'AppState',
          error: error,
        );
        // Use current time as fallback so the emergency isn't lost
        emergenciesWithDates.add((emergency: e, date: DateTime.now()));
      }
    }

    if (emergenciesWithDates.isEmpty) {
      return;
    }

    // Sort by date descending to get the most recent
    emergenciesWithDates.sort((a, b) => b.date.compareTo(a.date));
    
    final mostRecent = emergenciesWithDates.first;
    _currentEmergency = mostRecent.emergency;

    // Only play the alarm and show the alert dialog for emergencies created
    // within the last 5 minutes. Older emergencies are surfaced silently so
    // that the app reflects the current state without waking the user for a
    // stale event they already missed.
    DateTime? createdAt;
    try {
      createdAt = DateTime.parse(mostRecent.emergency.createdAt);
    } catch (error) {
      developer.log(
        'Error parsing createdAt for emergency ${mostRecent.emergency.id}: ${mostRecent.emergency.createdAt}',
        name: 'AppState',
        error: error,
      );
    }
    final age = createdAt != null
        ? DateTime.now().difference(createdAt)
        : const Duration(minutes: 0); // treat unparseable as fresh to avoid silent failures
    if (age <= const Duration(minutes: 5)) {
      AlarmService.playAlarm();
      _showAlarmDialog = true;
    }
    notifyListeners();
  }

  void _initializeWebSocket() {
    if (_isRegistered) {
      final serverUrl = StorageService.getServerUrl();
      final deviceToken = StorageService.getDeviceToken();
      if (serverUrl != null && deviceToken != null) {
        WebSocketService().connect(serverUrl, deviceToken);
        
        // Listen for incoming emergencies
        WebSocketService().messageStream?.listen((notification) {
          handleEmergencyNotification(notification);
        });
      }
    }
  }

  Future<void> register({
    required String serverUrl,
    required String registrationToken,
    required String deviceToken,
    required String platform,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      ApiService.setBaseUrl(serverUrl);
      final device = await ApiService.registerDevice(
        deviceToken: deviceToken,
        registrationToken: registrationToken,
        platform: platform,
      );

      await StorageService.setServerUrl(serverUrl);
      await StorageService.setDeviceId(device.id);
      await StorageService.setDeviceToken(deviceToken);
      await StorageService.setRegistrationToken(registrationToken);

      _isRegistered = true;
      
      // Connect WebSocket using deviceToken
      WebSocketService().connect(serverUrl, deviceToken);
      
      // Listen for incoming emergencies
      WebSocketService().messageStream?.listen((notification) {
        handleEmergencyNotification(notification);
      });
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void handleEmergencyNotification(PushNotificationData notification) {
    _currentEmergency = notification.toEmergency();
    _showAlarmDialog = true;
    
    // Play alarm sound
    AlarmService.playAlarm();
    
    // Show local notification (especially important for iOS)
    NotificationService.showEmergencyNotification(
      title: 'ALARM: ${_currentEmergency!.emergencyKeyword}',
      body: _currentEmergency!.emergencyDescription,
      payload: _currentEmergency!.id,
    );
    
    notifyListeners(); // This will trigger UI update to show popup
  }

  Future<void> submitResponse(bool participating) async {
    if (_currentEmergency == null) return;

    final deviceId = StorageService.getDeviceId();
    if (deviceId == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      await ApiService.submitResponse(
        emergencyId: _currentEmergency!.id,
        deviceId: deviceId,
        participating: participating,
      );

      await AlarmService.stopAlarm();
      _currentEmergency = null;
      _showAlarmDialog = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadEmergencies() async {
    _isLoading = true;
    notifyListeners();

    try {
      _emergencies = await ApiService.getEmergencies();
    } on SocketException {
      _errorMessage = 'Keine Verbindung zum Server. Bitte Netzwerk prüfen.';
    } on TimeoutException {
      _errorMessage = 'Zeitüberschreitung beim Laden der Einsätze.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadServerInfo() async {
    try {
      _serverInfo = await ApiService.getServerInfo();
    } on SocketException {
      _errorMessage = 'Keine Verbindung zum Server. Bitte Netzwerk prüfen.';
    } on TimeoutException {
      _errorMessage = 'Zeitüberschreitung beim Laden der Server-Informationen.';
    } catch (e) {
      debugPrint('Error loading server info: $e');
    }
  }

  Future<void> _loadDeviceDetails() async {
    try {
      final deviceId = StorageService.getDeviceId();
      if (deviceId != null) {
        _deviceDetails = await ApiService.getDeviceDetails(deviceId);
      }
    } catch (e) {
      debugPrint('Error loading device details: $e');
    }
  }

  Future<void> refreshInfo() async {
    await _loadServerInfo();
    await _loadDeviceDetails();
    notifyListeners();
  }

  Future<void> logout() async {
    await StorageService.clear();
    WebSocketService().disconnect();
    _isRegistered = false;
    _currentEmergency = null;
    _showAlarmDialog = false;
    _emergencies = [];
    _serverInfo = null;
    _deviceDetails = null;
    notifyListeners();
  }

  @override
  void dispose() {
    WebSocketService().disconnect();
    AlarmService.dispose();
    super.dispose();
  }
}

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
  List<Emergency> _emergencies = [];
  bool _isLoading = false;
  ServerInfo? _serverInfo;
  DeviceDetails? _deviceDetails;

  AppState() {
    _checkRegistration();
    _initializeWebSocket();
  }

  bool get isRegistered => _isRegistered;
  Emergency? get currentEmergency => _currentEmergency;
  List<Emergency> get emergencies => _emergencies;
  bool get isLoading => _isLoading;
  ServerInfo? get serverInfo => _serverInfo;
  DeviceDetails? get deviceDetails => _deviceDetails;

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
    final emergenciesWithDates = activeEmergencies.map((e) {
      try {
        final date = DateTime.parse(e.emergencyDate);
        return {'emergency': e, 'date': date};
      } catch (error) {
        debugPrint('Error parsing emergency date: ${e.emergencyDate}');
        return null;
      }
    }).whereType<Map<String, dynamic>>().toList();

    if (emergenciesWithDates.isEmpty) {
      return;
    }

    // Sort by date descending to get the most recent
    emergenciesWithDates.sort((a, b) => 
      (b['date'] as DateTime).compareTo(a['date'] as DateTime)
    );
    
    _currentEmergency = emergenciesWithDates.first['emergency'] as Emergency;
    AlarmService.playAlarm();
    notifyListeners();
  }

  void _initializeWebSocket() {
    if (_isRegistered) {
      final serverUrl = StorageService.getServerUrl();
      final deviceId = StorageService.getDeviceId();
      if (serverUrl != null && deviceId != null) {
        WebSocketService.connect(serverUrl, deviceId);
        
        // Listen for incoming emergencies
        WebSocketService.messageStream?.listen((notification) {
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
      
      // Connect WebSocket
      WebSocketService.connect(serverUrl, device.id);
      
      // Listen for incoming emergencies
      WebSocketService.messageStream?.listen((notification) {
        handleEmergencyNotification(notification);
      });
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void handleEmergencyNotification(PushNotificationData notification) {
    _currentEmergency = notification.toEmergency();
    
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
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadServerInfo() async {
    try {
      _serverInfo = await ApiService.getServerInfo();
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
    WebSocketService.disconnect();
    _isRegistered = false;
    _currentEmergency = null;
    _emergencies = [];
    _serverInfo = null;
    _deviceDetails = null;
    notifyListeners();
  }

  @override
  void dispose() {
    WebSocketService.disconnect();
    AlarmService.dispose();
    super.dispose();
  }
}

import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/alarm_service.dart';

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
      }
    }
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
    AlarmService.playAlarm();
    notifyListeners();
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
      print('Error loading server info: $e');
    }
  }

  Future<void> _loadDeviceDetails() async {
    try {
      final deviceId = StorageService.getDeviceId();
      if (deviceId != null) {
        _deviceDetails = await ApiService.getDeviceDetails(deviceId);
      }
    } catch (e) {
      print('Error loading device details: $e');
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

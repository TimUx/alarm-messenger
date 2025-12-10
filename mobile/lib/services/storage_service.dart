import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Device Token
  static Future<void> setDeviceToken(String token) async {
    await _prefs.setString('deviceToken', token);
  }

  static String? getDeviceToken() {
    return _prefs.getString('deviceToken');
  }

  // Device ID
  static Future<void> setDeviceId(String id) async {
    await _prefs.setString('deviceId', id);
  }

  static String? getDeviceId() {
    return _prefs.getString('deviceId');
  }

  // Server URL
  static Future<void> setServerUrl(String url) async {
    await _prefs.setString('serverUrl', url);
  }

  static String? getServerUrl() {
    return _prefs.getString('serverUrl');
  }

  // Registration Token
  static Future<void> setRegistrationToken(String token) async {
    await _prefs.setString('registrationToken', token);
  }

  static String? getRegistrationToken() {
    return _prefs.getString('registrationToken');
  }

  // Theme Mode
  static Future<void> setThemeMode(String mode) async {
    await _prefs.setString('themeMode', mode);
  }

  static String? getThemeMode() {
    return _prefs.getString('themeMode');
  }

  // Clear all data
  static Future<void> clear() async {
    await _prefs.clear();
  }

  // Check if registered
  static bool isRegistered() {
    final token = getDeviceToken();
    final id = getDeviceId();
    final url = getServerUrl();
    return token != null && id != null && url != null;
  }
}

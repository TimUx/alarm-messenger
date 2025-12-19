import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  static String _baseUrl = 'http://localhost:3000/api';

  static void setBaseUrl(String url) {
    _baseUrl = '$url/api';
  }

  static String get baseUrl => _baseUrl;

  // Device registration
  static Future<Device> registerDevice({
    required String deviceToken,
    required String registrationToken,
    required String platform,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/devices/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceToken': deviceToken,
        'registrationToken': registrationToken,
        'platform': platform,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Device.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to register device: ${response.body}');
    }
  }

  // Get emergency by ID
  static Future<Emergency> getEmergency(String id) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/emergencies/$id'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return Emergency.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get emergency: ${response.body}');
    }
  }

  // Get all emergencies
  static Future<List<Emergency>> getEmergencies() async {
    final response = await http.get(
      Uri.parse('$_baseUrl/emergencies'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Emergency.fromJson(json)).toList();
    } else {
      throw Exception('Failed to get emergencies: ${response.body}');
    }
  }

  // Submit emergency response
  static Future<void> submitResponse({
    required String emergencyId,
    required String deviceId,
    required bool participating,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/emergencies/$emergencyId/responses'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceId': deviceId,
        'participating': participating,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to submit response: ${response.body}');
    }
  }

  // Get server info
  static Future<ServerInfo> getServerInfo() async {
    final response = await http.get(
      Uri.parse('$_baseUrl/info'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return ServerInfo.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get server info: ${response.body}');
    }
  }

  // Get device details with groups
  static Future<DeviceDetails> getDeviceDetails(String deviceId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/devices/$deviceId/details'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return DeviceDetails.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get device details: ${response.body}');
    }
  }
}

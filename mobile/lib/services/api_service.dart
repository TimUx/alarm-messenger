import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/models.dart';
import '../services/api_errors.dart';
import '../services/storage_service.dart';
import '../utils/registration_payload.dart';

class ApiService {
  static String _baseUrl = 'http://localhost:3000/api';

  static const Duration _httpTimeout = Duration(seconds: 25);

  static void setBaseUrl(String url) {
    _baseUrl = '$url/api';
  }

  static String get baseUrl => _baseUrl;

  static Future<http.Response> _get(Uri uri, {Map<String, String>? headers}) {
    return http.get(uri, headers: headers).timeout(_httpTimeout);
  }

  static Future<http.Response> _post(
    Uri uri, {
    Map<String, String>? headers,
    Object? body,
  }) {
    return http.post(uri, headers: headers, body: body).timeout(_httpTimeout);
  }

  /// Resolves a server-signed invite JWT from [registrationLink] / E-Mail flow.
  static Future<RegistrationPayload> resolveRegistrationInvite({
    required String serverOrigin,
    required String inviteToken,
  }) async {
    final origin = serverOrigin.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse('$origin/api/registration/resolve').replace(
      queryParameters: {'token': inviteToken.trim()},
    );
    try {
      final response = await _get(uri, headers: {'Accept': 'application/json'});
      if (response.statusCode != 200) {
        throw Exception(userFacingApiError(response, context: 'Einladung'));
      }
      final map = jsonDecode(response.body) as Map<String, dynamic>;
      final serverUrl = map['serverUrl'] as String?;
      final token = map['token'] as String?;
      if (serverUrl == null || token == null || serverUrl.isEmpty || token.isEmpty) {
        throw Exception('Ungültige Server-Antwort.');
      }
      return RegistrationPayload(serverUrl: serverUrl, registrationToken: token);
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Laden der Einladung.');
    }
  }

  static Future<Device> registerDevice({
    required String deviceToken,
    required String registrationToken,
    required String platform,
  }) async {
    try {
      final response = await _post(
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
      }
      throw Exception(userFacingApiError(response, context: 'Registrierung'));
    } on TimeoutException {
      throw Exception('Zeitüberschreitung bei der Registrierung.');
    }
  }

  static Future<Emergency> getEmergency(String id) async {
    final deviceToken = StorageService.getDeviceToken();
    try {
      final response = await _get(
        Uri.parse('$_baseUrl/emergencies/$id'),
        headers: {
          'Content-Type': 'application/json',
          if (deviceToken != null) 'X-Device-Token': deviceToken,
        },
      );

      if (response.statusCode == 200) {
        return Emergency.fromJson(jsonDecode(response.body));
      }
      throw Exception(userFacingApiError(response, context: 'Einsatz'));
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Laden des Einsatzes.');
    }
  }

  static Future<List<Emergency>> getEmergencies() async {
    final deviceToken = StorageService.getDeviceToken();
    try {
      final response = await _get(
        Uri.parse('$_baseUrl/emergencies'),
        headers: {
          'Content-Type': 'application/json',
          if (deviceToken != null) 'X-Device-Token': deviceToken,
        },
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        if (responseData is List) {
          return responseData.map((json) => Emergency.fromJson(json)).toList();
        } else if (responseData is Map && responseData.containsKey('data')) {
          final List<dynamic> data = responseData['data'];
          return data.map((json) => Emergency.fromJson(json)).toList();
        }
        return [];
      }
      throw Exception(userFacingApiError(response, context: 'Einsätze'));
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Laden der Einsätze.');
    }
  }

  static Future<void> submitResponse({
    required String emergencyId,
    required String deviceId,
    required bool participating,
  }) async {
    final deviceToken = StorageService.getDeviceToken();
    try {
      final response = await _post(
        Uri.parse('$_baseUrl/emergencies/$emergencyId/responses'),
        headers: {
          'Content-Type': 'application/json',
          if (deviceToken != null) 'X-Device-Token': deviceToken,
        },
        body: jsonEncode({
          'deviceId': deviceId,
          'participating': participating,
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(userFacingApiError(response, context: 'Rückmeldung'));
      }
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Senden der Rückmeldung.');
    }
  }

  static Future<ServerInfo> getServerInfo() async {
    try {
      final response = await _get(
        Uri.parse('$_baseUrl/info'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        return ServerInfo.fromJson(jsonDecode(response.body));
      }
      throw Exception(userFacingApiError(response, context: 'Server-Info'));
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Laden der Server-Informationen.');
    }
  }

  static Future<void> updatePushToken({
    required String deviceToken,
    String? fcmToken,
    String? apnsToken,
  }) async {
    final Map<String, dynamic> body = {
      'deviceToken': deviceToken,
    };

    if (fcmToken != null) {
      body['fcmToken'] = fcmToken;
    }

    if (apnsToken != null) {
      body['apnsToken'] = apnsToken;
    }

    try {
      final response = await _post(
        Uri.parse('$_baseUrl/devices/update-push-token'),
        headers: {
          'Content-Type': 'application/json',
          if (deviceToken.isNotEmpty) 'X-Device-Token': deviceToken,
        },
        body: jsonEncode(body),
      );

      if (response.statusCode != 200) {
        throw Exception(userFacingApiError(response, context: 'Push-Token'));
      }
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Aktualisieren des Push-Tokens.');
    }
  }

  static Future<DeviceDetails> getDeviceDetails(String deviceId) async {
    final deviceToken = StorageService.getDeviceToken();
    try {
      final response = await _get(
        Uri.parse('$_baseUrl/devices/$deviceId/details'),
        headers: {
          'Content-Type': 'application/json',
          if (deviceToken != null) 'X-Device-Token': deviceToken,
        },
      );

      if (response.statusCode == 200) {
        return DeviceDetails.fromJson(jsonDecode(response.body));
      }
      throw Exception(userFacingApiError(response, context: 'Gerätedetails'));
    } on TimeoutException {
      throw Exception('Zeitüberschreitung beim Laden der Gerätedetails.');
    }
  }
}

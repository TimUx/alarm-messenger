import 'dart:convert';

import 'package:http/http.dart' as http;

/// Maps HTTP responses to short German user messages.
String userFacingApiError(http.Response response, {String? context}) {
  final prefix = context != null ? '$context: ' : '';
  String? serverMessage;
  try {
    final decoded = jsonDecode(response.body);
    if (decoded is Map && decoded['error'] is String) {
      serverMessage = decoded['error'] as String;
    }
  } catch (_) {}

  switch (response.statusCode) {
    case 400:
      return serverMessage ?? '${prefix}Ungültige Anfrage.';
    case 401:
      return serverMessage ?? '${prefix}Nicht autorisiert.';
    case 403:
      return serverMessage ?? '${prefix}Zugriff verweigert.';
    case 404:
      return serverMessage ?? '${prefix}Nicht gefunden.';
    case 409:
      return serverMessage ?? '${prefix}Konflikt.';
    case 410:
      return serverMessage ?? '${prefix}Nicht mehr verfügbar.';
    case 422:
      return serverMessage ?? '${prefix}Eingaben konnten nicht verarbeitet werden.';
    case 429:
      return '${prefix}Zu viele Anfragen. Bitte kurz warten.';
    case 500:
    case 502:
    case 503:
      return '${prefix}Serverfehler. Bitte später erneut versuchen.';
    default:
      if (serverMessage != null && serverMessage.isNotEmpty) {
        return '$prefix$serverMessage';
      }
      return '${prefix}Anfrage fehlgeschlagen (HTTP ${response.statusCode}).';
  }
}

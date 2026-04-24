import 'dart:convert';
import 'dart:io' show Platform;

/// Payload encoded in the admin QR code (JSON or legacy pipe format).
class RegistrationPayload {
  const RegistrationPayload({
    required this.serverUrl,
    required this.registrationToken,
  });

  final String serverUrl;
  final String registrationToken;
}

/// True if [s] looks like a JWT (three dot-separated segments).
bool looksLikeInviteJwt(String s) {
  final t = s.trim();
  final parts = t.split('.');
  if (parts.length != 3) return false;
  return parts.every((p) => p.isNotEmpty);
}

/// Parses an HTTPS registration page URL with `token` query (invite JWT).
Uri? parseRegistrationHttpUrl(String raw) {
  final t = raw.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) {
    return null;
  }
  final u = Uri.tryParse(t);
  if (u == null) return null;
  if (!u.queryParameters.containsKey('token')) return null;
  final path = u.path.toLowerCase();
  if (path != '/register' && !path.endsWith('/register')) {
    return null;
  }
  return u;
}

/// Parses QR/raw text: `{"serverUrl":"...","token":"..."}` or `serverUrl|token`.
RegistrationPayload parseRegistrationPayload(String code) {
  final trimmed = code.trim();
  if (trimmed.isEmpty) {
    throw const FormatException('Leerer Inhalt');
  }

  if (trimmed.startsWith('{')) {
    final dynamic jsonData = jsonDecode(trimmed);
    if (jsonData is Map &&
        jsonData['token'] is String &&
        jsonData['serverUrl'] is String) {
      final serverUrl = jsonData['serverUrl'] as String;
      final registrationToken = jsonData['token'] as String;
      if (serverUrl.isEmpty || registrationToken.isEmpty) {
        throw const FormatException('Ungültiges JSON');
      }
      return RegistrationPayload(
        serverUrl: serverUrl,
        registrationToken: registrationToken,
      );
    }
    throw const FormatException('Ungültiges JSON');
  }

  final parts = trimmed.split('|');
  if (parts.length != 2) {
    throw const FormatException(
      'Erwartet JSON {"serverUrl":"...","token":"..."} oder serverUrl|token',
    );
  }
  final serverUrl = parts[0].trim();
  final registrationToken = parts[1].trim();
  if (serverUrl.isEmpty || registrationToken.isEmpty) {
    throw const FormatException('Ungültiges Pipe-Format');
  }
  return RegistrationPayload(
    serverUrl: serverUrl,
    registrationToken: registrationToken,
  );
}

/// Value for [AppState.register] `platform`, aligned with API validation.
String deviceRegistrationPlatform() {
  if (Platform.isAndroid) return 'android';
  if (Platform.isIOS) return 'ios';
  if (Platform.isLinux) return 'linux';
  return 'android';
}

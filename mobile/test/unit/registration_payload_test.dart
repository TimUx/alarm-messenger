import 'package:alarm_messenger/utils/registration_payload.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseRegistrationPayload', () {
    test('parses JSON payload', () {
      final p = parseRegistrationPayload(
        '{"serverUrl":"https://x.example","token":"abc-123"}',
      );
      expect(p.serverUrl, 'https://x.example');
      expect(p.registrationToken, 'abc-123');
    });

    test('parses pipe payload', () {
      final p = parseRegistrationPayload('https://h.test|tok-one');
      expect(p.serverUrl, 'https://h.test');
      expect(p.registrationToken, 'tok-one');
    });

    test('rejects empty', () {
      expect(() => parseRegistrationPayload(''), throwsFormatException);
    });

    test('rejects invalid pipe', () {
      expect(() => parseRegistrationPayload('only-url'), throwsFormatException);
    });

  });

  group('parseRegistrationHttpUrl', () {
    test('accepts register link', () {
      final u = parseRegistrationHttpUrl(
        'https://alarm.example/register?token=abc.def.ghi',
      );
      expect(u, isNotNull);
      expect(u!.queryParameters['token'], 'abc.def.ghi');
    });
  });

  group('looksLikeInviteJwt', () {
    test('detects three segments', () {
      expect(looksLikeInviteJwt('a.b.c'), isTrue);
      expect(looksLikeInviteJwt('nodots'), isFalse);
    });
  });
}

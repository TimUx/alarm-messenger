import 'dart:convert';
import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/models.dart';
import 'storage_service.dart';

class WebSocketService {
  static WebSocketChannel? _channel;
  static StreamController<PushNotificationData>? _messageController;
  static bool _isConnected = false;

  static Stream<PushNotificationData>? get messageStream => _messageController?.stream;
  static bool get isConnected => _isConnected;

  static void connect(String serverUrl, String deviceId) {
    if (_isConnected) {
      return;
    }

    try {
      // Convert http(s) URL to ws(s) URL
      final wsUrl = serverUrl.replaceFirst('http', 'ws');
      final uri = Uri.parse('$wsUrl?deviceId=$deviceId');

      _channel = WebSocketChannel.connect(uri);
      _messageController = StreamController<PushNotificationData>.broadcast();

      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message as String);
            if (data['type'] == 'emergency') {
              final notification = PushNotificationData.fromJson(data);
              _messageController?.add(notification);
            }
          } catch (e) {
            print('Error parsing WebSocket message: $e');
          }
        },
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
          _reconnect(serverUrl, deviceId);
        },
        onDone: () {
          print('WebSocket connection closed');
          _isConnected = false;
          _reconnect(serverUrl, deviceId);
        },
      );

      _isConnected = true;
      print('✓ WebSocket connected to $wsUrl');
    } catch (e) {
      print('Failed to connect WebSocket: $e');
      _isConnected = false;
      _reconnect(serverUrl, deviceId);
    }
  }

  static void _reconnect(String serverUrl, String deviceId) {
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isConnected) {
        print('Attempting to reconnect WebSocket...');
        connect(serverUrl, deviceId);
      }
    });
  }

  static void disconnect() {
    _isConnected = false;
    _channel?.sink.close();
    _messageController?.close();
    _channel = null;
    _messageController = null;
    print('WebSocket disconnected');
  }

  static void sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }
}

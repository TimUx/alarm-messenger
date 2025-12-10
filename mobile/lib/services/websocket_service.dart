import 'dart:convert';
import 'dart:async';
import 'dart:developer' as developer;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/models.dart';

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
            developer.log('Error parsing WebSocket message', name: 'WebSocketService', error: e);
          }
        },
        onError: (error) {
          developer.log('WebSocket error', name: 'WebSocketService', error: error);
          _isConnected = false;
          _reconnect(serverUrl, deviceId);
        },
        onDone: () {
          developer.log('WebSocket connection closed', name: 'WebSocketService');
          _isConnected = false;
          _reconnect(serverUrl, deviceId);
        },
      );

      _isConnected = true;
      developer.log('WebSocket connected to $wsUrl', name: 'WebSocketService');
    } catch (e) {
      developer.log('Failed to connect WebSocket', name: 'WebSocketService', error: e);
      _isConnected = false;
      _reconnect(serverUrl, deviceId);
    }
  }

  static void _reconnect(String serverUrl, String deviceId) {
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isConnected) {
        developer.log('Attempting to reconnect WebSocket...', name: 'WebSocketService');
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
    developer.log('WebSocket disconnected', name: 'WebSocketService');
  }

  static void sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }
}

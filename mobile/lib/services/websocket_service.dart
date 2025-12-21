import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
import 'dart:developer' as developer;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/models.dart';

class WebSocketService {
  static WebSocketChannel? _channel;
  static StreamController<PushNotificationData>? _messageController;
  static bool _isConnected = false;
  static String? _serverUrl;
  static String? _deviceId;
  static Timer? _heartbeatTimer;
  static Timer? _reconnectTimer;
  static int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;

  static Stream<PushNotificationData>? get messageStream => _messageController?.stream;
  static bool get isConnected => _isConnected;

  static void connect(String serverUrl, String deviceId) {
    if (_isConnected) {
      return;
    }

    // Store connection details for reconnection
    _serverUrl = serverUrl;
    _deviceId = deviceId;

    try {
      // Convert http(s) URL to ws(s) URL
      final wsUrl = serverUrl.replaceFirst('http', 'ws');
      final uri = Uri.parse('$wsUrl/ws'); // Remove query param, will register separately

      _channel = WebSocketChannel.connect(uri);
      _messageController = StreamController<PushNotificationData>.broadcast();

      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message as String);
            if (data['type'] == 'emergency') {
              final notification = PushNotificationData.fromJson(data);
              _messageController?.add(notification);
            } else if (data['type'] == 'pong') {
              developer.log('Received pong from server', name: 'WebSocketService');
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
      _reconnectAttempts = 0;
      developer.log('WebSocket connected to $wsUrl', name: 'WebSocketService');
      
      // Register device with WebSocket server
      sendMessage({
        'type': 'register',
        'deviceId': deviceId,
      });

      // Start heartbeat to keep connection alive (important for iOS)
      _startHeartbeat();
    } catch (e) {
      developer.log('Failed to connect WebSocket', name: 'WebSocketService', error: e);
      _isConnected = false;
      _reconnect(serverUrl, deviceId);
    }
  }

  static void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isConnected) {
        sendMessage({'type': 'ping'});
        developer.log('Sent ping to keep connection alive', name: 'WebSocketService');
      }
    });
  }

  static void _reconnect(String serverUrl, String deviceId) {
    // Cancel any existing reconnect timer
    _reconnectTimer?.cancel();

    if (_reconnectAttempts >= _maxReconnectAttempts) {
      developer.log(
        'Max reconnect attempts reached. Stopping reconnection.',
        name: 'WebSocketService',
      );
      return;
    }

    _reconnectAttempts++;
    // Exponential backoff using power: 2^(attempts-1) * 5
    // Attempt 1: 5s, Attempt 2: 10s, Attempt 3: 20s, Attempt 4: 40s, etc.
    // Capped at 5 minutes (300s) to avoid excessive delays
    final exponent = math.min(_reconnectAttempts - 1, 6); // Cap at 2^6 = 64 to prevent overflow
    final backoffSeconds = (5 * math.pow(2, exponent).toInt()).clamp(5, 300);
    final delay = Duration(seconds: backoffSeconds);

    _reconnectTimer = Timer(delay, () {
      if (!_isConnected) {
        developer.log(
          'Attempting to reconnect WebSocket... (attempt $_reconnectAttempts, delay ${backoffSeconds}s)',
          name: 'WebSocketService',
        );
        connect(serverUrl, deviceId);
      }
    });
  }

  static void disconnect() {
    _isConnected = false;
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _messageController?.close();
    _channel = null;
    _messageController = null;
    _reconnectAttempts = 0;
    developer.log('WebSocket disconnected', name: 'WebSocketService');
  }

  static void sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  // Method to manually trigger reconnection (useful when app comes to foreground)
  static void ensureConnected() {
    if (!_isConnected && _serverUrl != null && _deviceId != null) {
      developer.log('Manually reconnecting WebSocket...', name: 'WebSocketService');
      connect(_serverUrl!, _deviceId!);
    }
  }
}

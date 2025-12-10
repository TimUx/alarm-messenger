import 'dart:developer' as developer;
import 'package:audioplayers/audioplayers.dart';

class AlarmService {
  static final AudioPlayer _audioPlayer = AudioPlayer();
  static bool _isPlaying = false;

  static Future<void> playAlarm() async {
    if (_isPlaying) {
      return;
    }

    try {
      _isPlaying = true;
      await _audioPlayer.setReleaseMode(ReleaseMode.loop);
      await _audioPlayer.setVolume(1.0);
      // Try to play alarm.mp3, but don't fail if it doesn't exist
      try {
        await _audioPlayer.play(AssetSource('sounds/alarm.mp3'));
        developer.log('Alarm sound started', name: 'AlarmService');
      } catch (e) {
        developer.log('Warning: Could not play alarm.mp3 - file may be missing. Add alarm.mp3 to assets/sounds/', name: 'AlarmService');
        _isPlaying = false;
      }
    } catch (e) {
      developer.log('Error playing alarm: $e', name: 'AlarmService', error: e);
      _isPlaying = false;
    }
  }

  static Future<void> stopAlarm() async {
    if (!_isPlaying) {
      return;
    }

    try {
      await _audioPlayer.stop();
      _isPlaying = false;
      developer.log('Alarm sound stopped', name: 'AlarmService');
    } catch (e) {
      developer.log('Error stopping alarm: $e', name: 'AlarmService', error: e);
    }
  }

  static bool get isPlaying => _isPlaying;

  static void dispose() {
    _audioPlayer.dispose();
  }
}

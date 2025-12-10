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
      await _audioPlayer.play(AssetSource('sounds/alarm.mp3'));
      print('Alarm sound started');
    } catch (e) {
      print('Error playing alarm: $e');
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
      print('Alarm sound stopped');
    } catch (e) {
      print('Error stopping alarm: $e');
    }
  }

  static bool get isPlaying => _isPlaying;

  static void dispose() {
    _audioPlayer.dispose();
  }
}

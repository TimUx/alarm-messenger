import Sound from 'react-native-sound';

let alarmSound: Sound | null = null;

export const alarmService = {
  initialize(): void {
    Sound.setCategory('Playback');
    // Load alarm sound (you'll need to add an alarm.mp3 file to the assets)
    alarmSound = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load alarm sound', error);
        return;
      }
      console.log('Alarm sound loaded successfully');
      alarmSound?.setNumberOfLoops(-1); // Loop indefinitely
    });
  },

  play(): void {
    if (alarmSound) {
      alarmSound.setVolume(1.0);
      alarmSound.play((success) => {
        if (!success) {
          console.log('Playback failed');
        }
      });
    }
  },

  stop(): void {
    if (alarmSound) {
      alarmSound.stop();
    }
  },

  release(): void {
    if (alarmSound) {
      alarmSound.release();
      alarmSound = null;
    }
  },
};

# IMPORTANT: Add alarm.mp3 file here

This directory needs an `alarm.mp3` file for the alarm sound.

## Requirements
- Format: MP3
- Sample rate: 44.1kHz
- Channels: Mono or Stereo
- Duration: 3-10 seconds (will loop)
- Volume: Clear and loud for emergency alerts

## Where to find alarm sounds
- Use your own alarm sound file
- Free alarm sounds: https://freesound.org (search for "alarm" or "siren")
- Ensure you have proper licensing/rights to use the sound

## To add the file
1. Place your alarm.mp3 file in this directory
2. The file must be named exactly `alarm.mp3`
3. Rebuild the app: `flutter clean && flutter build apk`

Without this file, the app will still work but won't play alarm sounds.

# Mobile App Setup Guide

## Prerequisites

### For Both Platforms
- Node.js 18 or higher
- npm or yarn
- React Native CLI (`npm install -g react-native-cli`)
- Firebase project with Cloud Messaging enabled

### For iOS Development
- macOS
- Xcode 14 or higher
- CocoaPods (`sudo gem install cocoapods`)
- iOS Simulator or physical device
- Apple Developer Account (for physical devices)

### For Android Development
- Android Studio
- Android SDK (API Level 33 or higher)
- Android Emulator or physical device
- Java Development Kit (JDK) 11 or higher

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Configure Firebase

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Add an iOS app and/or Android app to your project

### iOS Configuration

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `mobile/ios/` directory
3. Open `mobile/ios/AlarmMessenger.xcworkspace` in Xcode
4. Add `GoogleService-Info.plist` to your project

### Android Configuration

1. Download `google-services.json` from Firebase Console
2. Place it in `mobile/android/app/` directory

## Step 3: Setup iOS

```bash
cd ios
pod install
cd ..
```

### Configure iOS Capabilities

1. Open `ios/AlarmMessenger.xcworkspace` in Xcode
2. Select your project in the navigator
3. Select the target "AlarmMessenger"
4. Go to "Signing & Capabilities"
5. Add "Push Notifications" capability
6. Add "Background Modes" capability
   - Check "Remote notifications"

### Info.plist Configuration

Add camera permission to `ios/AlarmMessenger/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app requires camera access to scan QR codes for device registration.</string>
```

## Step 4: Setup Android

### Update build.gradle

Add to `android/app/build.gradle`:

```gradle
dependencies {
    // ... other dependencies
    implementation 'com.google.firebase:firebase-messaging'
}

apply plugin: 'com.google.gms.google-services'
```

Add to `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // ... other dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### AndroidManifest.xml

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application>
    <!-- ... other configurations -->
    
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_channel_id"
        android:value="emergency_alerts" />
</application>
```

## Step 5: Add Alarm Sound

### iOS
1. Add `alarm.mp3` file to `ios/AlarmMessenger/`
2. Open Xcode
3. Right-click on project > Add Files to "AlarmMessenger"
4. Select `alarm.mp3`
5. Ensure "Copy items if needed" is checked
6. Add to target "AlarmMessenger"

### Android
1. Create directory: `android/app/src/main/res/raw/`
2. Add `alarm.mp3` to this directory

You can download a free alarm sound from:
- https://freesound.org/
- https://www.zapsplat.com/

## Step 6: Configure Server URL

In `mobile/src/services/api.ts`, update the default server URL:

```typescript
const API_BASE_URL = 'https://your-server-url.com/api';
```

Or configure it dynamically through QR code scanning.

## Step 7: Run the App

### iOS

```bash
npm run ios
```

Or in Xcode:
1. Open `ios/AlarmMessenger.xcworkspace`
2. Select a simulator or device
3. Click Run (⌘R)

### Android

```bash
npm run android
```

Or in Android Studio:
1. Open `android` folder
2. Select an emulator or device
3. Click Run

## Testing

### Test Device Registration

1. Start the backend server
2. Generate a QR code:
   ```bash
   curl -X POST http://localhost:3000/api/devices/registration-token
   ```
3. Open the mobile app
4. Tap "Start Scanning"
5. Display the QR code on another device or print it
6. Scan the QR code

### Test Emergency Notification

1. Create an emergency via API:
   ```bash
   curl -X POST http://localhost:3000/api/emergencies \
     -H "Content-Type: application/json" \
     -d '{
       "emergencyNumber": "TEST-001",
       "emergencyDate": "2024-12-07T19:00:00Z",
       "emergencyKeyword": "TEST",
       "emergencyDescription": "Test notification",
       "emergencyLocation": "Test location"
     }'
   ```
2. The app should display an alert with alarm sound

### Test Response Submission

1. Tap "TEILNEHMEN" or "NICHT VERFÜGBAR"
2. Check the response in the database:
   ```bash
   curl http://localhost:3000/api/emergencies/{emergency-id}/responses
   ```

## Troubleshooting

### iOS Issues

**CocoaPods errors:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Build fails:**
- Clean build folder: Xcode > Product > Clean Build Folder
- Delete `ios/Pods` and `ios/Podfile.lock`, then run `pod install`

**Push notifications not working:**
- Verify push notification capability is enabled
- Check APNs authentication key in Firebase
- Test on physical device (push notifications don't work in simulator)

### Android Issues

**Gradle sync fails:**
```bash
cd android
./gradlew clean
cd ..
```

**Firebase not working:**
- Verify `google-services.json` is in correct location
- Check Firebase configuration in `build.gradle`
- Ensure Google Services plugin is applied

**Camera not working:**
- Verify camera permission in AndroidManifest.xml
- Check runtime permissions are requested

### Common Issues

**Metro bundler errors:**
```bash
npm start -- --reset-cache
```

**Module not found:**
```bash
rm -rf node_modules
npm install
```

**React Native CLI issues:**
```bash
npm install -g react-native-cli
```

## Building for Production

### iOS

1. Open `ios/AlarmMessenger.xcworkspace` in Xcode
2. Select "Any iOS Device" or your connected device
3. Product > Archive
4. Follow Xcode's distribution workflow
5. Submit to App Store or distribute ad-hoc

### Android

1. Generate signing key:
   ```bash
   keytool -genkey -v -keystore alarm-messenger.keystore -alias alarm-messenger -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('alarm-messenger.keystore')
               storePassword 'your-password'
               keyAlias 'alarm-messenger'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. Build release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. Find APK at: `android/app/build/outputs/apk/release/app-release.apk`

5. For Play Store, build AAB:
   ```bash
   ./gradlew bundleRelease
   ```

## Customization

### Change App Name

**iOS:** Edit `ios/AlarmMessenger/Info.plist`
```xml
<key>CFBundleDisplayName</key>
<string>Your App Name</string>
```

**Android:** Edit `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Your App Name</string>
```

### Change App Icon

Use a tool like [App Icon Generator](https://appicon.co/) to generate icons for both platforms.

**iOS:** Replace icons in `ios/AlarmMessenger/Images.xcassets/AppIcon.appiconset/`

**Android:** Replace icons in `android/app/src/main/res/mipmap-*/`

### Change Colors

Edit `mobile/src/screens/*.tsx` files to customize colors:
- Background: `#1a1a1a`
- Emergency red: `#dc3545`
- Success green: `#28a745`

### Change Alarm Sound

Replace `alarm.mp3` files in both iOS and Android directories.

## Performance Optimization

### Android

1. Enable Proguard in `android/app/build.gradle`:
   ```gradle
   buildTypes {
       release {
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

2. Enable Hermes engine (enabled by default in React Native 0.70+)

### iOS

1. Enable Bitcode in Xcode build settings
2. Optimize images and assets

## Security

- [ ] Obfuscate source code for production
- [ ] Use SSL pinning for API communication
- [ ] Implement certificate pinning
- [ ] Store sensitive data in Keychain (iOS) / Keystore (Android)
- [ ] Validate all QR codes before processing
- [ ] Implement timeout for alarm sounds

## App Store Submission

### iOS - App Store

1. Create app in App Store Connect
2. Prepare screenshots and metadata
3. Archive and upload via Xcode
4. Submit for review

Requirements:
- App privacy policy
- App description
- Screenshots (multiple devices)
- App icon

### Android - Play Store

1. Create app in Play Console
2. Prepare store listing
3. Upload AAB file
4. Complete content rating questionnaire
5. Submit for review

Requirements:
- App privacy policy
- Feature graphic (1024x500)
- Screenshots (multiple devices)
- App icon

## Continuous Integration

### Fastlane Setup

Install Fastlane:
```bash
gem install fastlane
```

Initialize:
```bash
cd ios
fastlane init
cd ../android
fastlane init
```

Example Fastfile for iOS:
```ruby
lane :beta do
  build_app(scheme: "AlarmMessenger")
  upload_to_testflight
end
```

## Support

For issues:
1. Check React Native documentation
2. Check Firebase documentation
3. Review device logs
4. Test on different devices
5. Check GitHub issues

## Next Steps

After setup:
1. Test on multiple devices
2. Gather beta testers
3. Collect feedback
4. Optimize performance
5. Prepare for app store submission

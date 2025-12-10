# Flutter Migration Guide

This document describes the migration from React Native to Flutter for the Alarm Messenger mobile app.

## Overview

The mobile app has been completely rewritten using Flutter 3.27.1, maintaining all original features while improving cross-platform consistency and build reliability.

## What Changed

### Framework
- **Before**: React Native 0.78.3
- **After**: Flutter 3.27.1

### Language
- **Before**: TypeScript/JavaScript
- **After**: Dart

### State Management
- **Before**: React Context + Hooks
- **After**: Provider pattern

### Key Benefits
- ✅ More consistent iOS/Android behavior
- ✅ Better performance
- ✅ Simpler build process
- ✅ Single codebase with shared UI
- ✅ Better hot reload experience
- ✅ Stronger type safety with Dart

## Feature Parity

All features from the React Native version have been maintained:

| Feature | React Native | Flutter | Status |
|---------|-------------|---------|--------|
| QR Code Scanner | ✅ | ✅ | ✅ Complete |
| Device Registration | ✅ | ✅ | ✅ Complete |
| WebSocket Push Notifications | ✅ | ✅ | ✅ Complete |
| Emergency Alerts | ✅ | ✅ | ✅ Complete |
| Alarm Sound | ✅ | ✅ | ✅ Complete |
| Response Submission | ✅ | ✅ | ✅ Complete |
| Emergency History | ✅ | ✅ | ✅ Complete |
| Light/Dark Theme | ✅ | ✅ | ✅ Complete |
| Android Support | ✅ | ✅ | ✅ Complete |
| iOS Support | ✅ | ✅ | ✅ Complete |

## API Compatibility

The Flutter app maintains 100% API compatibility with the backend server:

- Same REST endpoints
- Same WebSocket protocol
- Same data models
- Same authentication flow

**No backend changes required!**

## File Structure Comparison

### React Native Structure
```
mobile/
├── src/
│   ├── App.tsx
│   ├── context/
│   ├── screens/
│   ├── services/
│   └── types/
├── android/
├── ios/
└── package.json
```

### Flutter Structure
```
mobile/
├── lib/
│   ├── main.dart
│   ├── models/
│   ├── providers/
│   ├── screens/
│   ├── services/
│   └── widgets/
├── android/
├── ios/
├── assets/
└── pubspec.yaml
```

## Dependencies Mapping

| React Native | Flutter | Purpose |
|--------------|---------|---------|
| @react-native-async-storage/async-storage | shared_preferences | Local storage |
| axios | http | HTTP client |
| react-native-qrcode-scanner | qr_code_scanner | QR scanning |
| react-native-permissions | permission_handler | Permissions |
| react-native-sound | audioplayers | Audio playback |
| (WebSocket built-in) | web_socket_channel | WebSocket |
| @react-navigation/native | (Material/Cupertino built-in) | Navigation |

## Build Process

### React Native
```bash
# Android
cd android && ./gradlew assembleDebug

# iOS
cd ios && xcodebuild -workspace ...
```

### Flutter
```bash
# Android
flutter build apk

# iOS
flutter build ios
```

**Much simpler!**

## CI/CD Changes

### Old Workflow
- `.github/workflows/mobile-build.yml` (React Native)
- Complex setup with Node.js, CocoaPods, Gradle

### New Workflow
- `.github/workflows/flutter-mobile-build.yml`
- Uses `subosito/flutter-action`
- Simpler, faster builds
- Same outputs: APK, AAB

## Migration Steps Completed

1. ✅ Created new Flutter project structure
2. ✅ Ported all data models (Emergency, Device, etc.)
3. ✅ Reimplemented all services (API, Storage, WebSocket, Alarm)
4. ✅ Recreated all UI screens with Material Design
5. ✅ Configured Android and iOS platforms
6. ✅ Set up CI/CD with GitHub Actions
7. ✅ Updated documentation
8. ✅ Moved React Native code to backup directory

## For Developers

### Setting Up Development Environment

1. **Install Flutter SDK**
   ```bash
   # See: https://docs.flutter.dev/get-started/install
   ```

2. **Verify Installation**
   ```bash
   flutter doctor
   ```

3. **Get Dependencies**
   ```bash
   cd mobile
   flutter pub get
   ```

4. **Run on Device/Emulator**
   ```bash
   flutter run
   ```

### Development Tips

- Use `flutter pub get` instead of `npm install`
- Hot reload: Press `r` in terminal or use IDE
- Hot restart: Press `R` in terminal
- Use Flutter DevTools for debugging
- Material Design widgets are used for UI

### Testing

```bash
# Run unit tests
flutter test

# Run integration tests
flutter drive --target=test_driver/app.dart
```

### Building

```bash
# Debug build
flutter build apk --debug

# Release build (requires signing)
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Breaking Changes

### For Users
- **None!** The app works exactly the same way
- QR codes from admin panel still work
- All features maintained
- UI looks similar with Material Design

### For Developers
- Need to learn Dart (similar to TypeScript)
- Need to install Flutter SDK
- Different debugging tools
- Different plugin ecosystem

## Rollback Plan

If issues arise, the React Native version is preserved in `mobile-react-native-backup/`:

```bash
# Restore React Native version
rm -rf mobile
mv mobile-react-native-backup mobile

# Restore workflow
mv .github/workflows/mobile-build.yml.disabled .github/workflows/mobile-build.yml
rm .github/workflows/flutter-mobile-build.yml
```

## Support & Resources

### Flutter Resources
- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Pub.dev (Package Repository)](https://pub.dev/)

### Project-Specific
- [mobile/README.md](mobile/README.md) - Flutter app documentation
- [docs/MOBILE.md](docs/MOBILE.md) - Legacy React Native docs
- GitHub Issues for bug reports

## Timeline

- **Decision**: December 2024
- **Development**: December 2024
- **Testing**: December 2024
- **Deployment**: TBD

## Conclusion

The migration to Flutter provides a more maintainable, performant, and easier-to-build mobile app while maintaining 100% feature parity with the original React Native version. All functionality works identically from the user's perspective.

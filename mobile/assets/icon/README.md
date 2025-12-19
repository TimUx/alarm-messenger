# App Icon

This directory contains the app icon for the Alarm Messenger mobile application.

## Icon File

- **File**: `icon.png`
- **Dimensions**: 1024x1024 pixels
- **Format**: PNG (RGB, non-interlaced)
- **Size**: ~753 KB

## Usage

The icon is automatically integrated into the build process using the `flutter_launcher_icons` package.

### Automatic Icon Generation

During the build process (CI/CD), the following command is executed:

```bash
flutter pub run flutter_launcher_icons
```

This command generates all required icon sizes for both Android and iOS platforms from the source `icon.png` file.

### Generated Icons

**Android:**
- Adaptive icons for all densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Launcher icons in various sizes

**iOS:**
- AppIcon set with all required sizes
- Includes icons for different device types and contexts

## Configuration

The icon generation is configured in `pubspec.yaml`:

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon/icon.png"
```

## Manual Icon Generation

If you need to regenerate the icons manually during development:

```bash
cd mobile
flutter pub get
flutter pub run flutter_launcher_icons
```

## Icon Requirements

- The source icon should be 1024x1024 pixels
- PNG format with transparency support
- Square aspect ratio
- High resolution for best results

## Notes

- Icons are generated automatically during the CI/CD build process
- The generated icons are not committed to the repository
- Each build generates fresh icons from the source file

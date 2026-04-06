import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../l10n/strings.dart';

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _processQRCode(String code) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      await _controller.stop();
    } catch (_) {
      // Ignore stop errors; proceed with processing
    }

    try {
      // Parse QR code - supports both formats:
      // 1. JSON format: {"token":"...", "serverUrl":"..."}
      // 2. Legacy pipe format: serverUrl|registrationToken
      String serverUrl;
      String registrationToken;
      
      try {
        // Try to parse as JSON first
        final jsonData = jsonDecode(code);
        if (jsonData is Map && jsonData.containsKey('token') && jsonData.containsKey('serverUrl')) {
          serverUrl = jsonData['serverUrl'];
          registrationToken = jsonData['token'];
        } else {
          throw Exception('Invalid JSON format');
        }
      } catch (e) {
        // Fall back to legacy pipe-delimited format
        final parts = code.split('|');
        if (parts.length != 2) {
          throw Exception('Invalid QR code format');
        }
        serverUrl = parts[0];
        registrationToken = parts[1];
      }

      final platform = Platform.isAndroid ? 'android' : 'ios';
      final deviceToken = registrationToken; // Use the token from QR code

      final appState = Provider.of<AppState>(context, listen: false);
      await appState.register(
        serverUrl: serverUrl,
        registrationToken: registrationToken,
        deviceToken: deviceToken,
        platform: platform,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(AppStrings.registrationSuccess),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${AppStrings.registrationFailed}$e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      await _controller.start();
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alarm Messenger'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Icon(
                  Icons.qr_code_scanner,
                  size: 80,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Gerät registrieren',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Scannen Sie den QR-Code aus dem Admin-Interface',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          Expanded(
            child: _isProcessing
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text(AppStrings.registering),
                      ],
                    ),
                  )
                : MobileScanner(
                    controller: _controller,
                    onDetect: (capture) {
                      if (_isProcessing) return;
                      final barcode = capture.barcodes.firstOrNull;
                      if (barcode?.rawValue != null) {
                        _processQRCode(barcode!.rawValue!);
                      }
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Kamera auf den QR-Code richten',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

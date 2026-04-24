import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../l10n/strings.dart';
import '../providers/app_state.dart';
import '../services/api_service.dart';
import '../utils/registration_payload.dart';

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  MobileScannerController? _scannerController;
  final TextEditingController _manualPayloadController = TextEditingController();
  final TextEditingController _serverUrlController = TextEditingController();
  final TextEditingController _deviceTokenController = TextEditingController();
  bool _isProcessing = false;
  bool _linkConsumeInProgress = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    if (!Platform.isLinux) {
      _scannerController = MobileScannerController();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    unawaited(_consumeDeepLinkInviteIfAny());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scannerController?.dispose();
    _manualPayloadController.dispose();
    _serverUrlController.dispose();
    _deviceTokenController.dispose();
    super.dispose();
  }

  void _showErrorSnack(String message) {
    if (!mounted) return;
    final scheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: TextStyle(color: scheme.onErrorContainer),
        ),
        backgroundColor: scheme.errorContainer,
      ),
    );
  }

  void _showSuccessSnack() {
    if (!mounted) return;
    final scheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          AppStrings.registrationSuccess,
          style: TextStyle(color: scheme.onPrimaryContainer),
        ),
        backgroundColor: scheme.primaryContainer,
      ),
    );
  }

  Future<void> _consumeDeepLinkInviteIfAny() async {
    if (!mounted || _linkConsumeInProgress || _isProcessing) return;
    final appState = Provider.of<AppState>(context, listen: false);
    final invite = appState.takePendingInvite();
    if (invite == null) return;

    _linkConsumeInProgress = true;
    try {
      final payload = await ApiService.resolveRegistrationInvite(
        serverOrigin: invite.server,
        inviteToken: invite.token,
      );
      await _registerWithPayload(payload);
    } catch (e) {
      if (mounted) {
        _showErrorSnack('${AppStrings.registrationFailed}$e');
      }
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    } finally {
      _linkConsumeInProgress = false;
    }
  }

  Future<void> _pauseScanner() async {
    if (_scannerController != null) {
      try {
        await _scannerController!.stop();
      } catch (_) {}
    }
  }

  Future<void> _resumeScanner() async {
    if (_scannerController != null) {
      try {
        await _scannerController!.start();
      } catch (_) {}
    }
  }

  Future<RegistrationPayload> _resolveManualInput() async {
    final combined = _manualPayloadController.text.trim();
    final serverField = _serverUrlController.text.trim().replaceAll(RegExp(r'/+$'), '');
    final deviceField = _deviceTokenController.text.trim();

    final urlHit = parseRegistrationHttpUrl(combined);
    if (urlHit != null) {
      final jwt = urlHit.queryParameters['token'];
      if (jwt == null || jwt.isEmpty) {
        throw const FormatException('Ungültige Registrierungs-URL');
      }
      return ApiService.resolveRegistrationInvite(
        serverOrigin: urlHit.origin,
        inviteToken: jwt,
      );
    }

    if (looksLikeInviteJwt(combined)) {
      if (serverField.isEmpty) {
        throw const FormatException(
          'Bei Einladungs-JWT bitte die Server-URL im Feld unten eintragen (z. B. https://alarm.example.de).',
        );
      }
      return ApiService.resolveRegistrationInvite(
        serverOrigin: serverField,
        inviteToken: combined,
      );
    }

    if (combined.isNotEmpty) {
      return parseRegistrationPayload(combined);
    }

    if (serverField.isNotEmpty && deviceField.isNotEmpty) {
      return RegistrationPayload(
        serverUrl: serverField,
        registrationToken: deviceField,
      );
    }

    throw const FormatException(
      'Bitte JSON, serverUrl|token, Registrierungs-Link, oder Server-URL + Geräte-Token angeben.',
    );
  }

  Future<void> _registerWithPayload(RegistrationPayload payload) async {
    if (!mounted) return;
    setState(() {
      _isProcessing = true;
    });

    final appState = Provider.of<AppState>(context, listen: false);
    await _pauseScanner();

    try {
      final devicePreToken = payload.registrationToken;
      await appState.register(
        serverUrl: payload.serverUrl,
        registrationToken: devicePreToken,
        deviceToken: devicePreToken,
        platform: deviceRegistrationPlatform(),
      );

      if (!mounted) return;
      _showSuccessSnack();
    } catch (e) {
      if (mounted) {
        _showErrorSnack('${AppStrings.registrationFailed}$e');
      }
      await _resumeScanner();
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _submitManual() async {
    if (_isProcessing) return;
    try {
      final payload = await _resolveManualInput();
      await _registerWithPayload(payload);
    } catch (e) {
      if (mounted) {
        _showErrorSnack('${AppStrings.registrationFailed}$e');
      }
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _onScanDetected(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;
    try {
      final raw = barcode!.rawValue!.trim();
      RegistrationPayload payload;
      final urlHit = parseRegistrationHttpUrl(raw);
      if (urlHit != null) {
        final jwt = urlHit.queryParameters['token']!;
        payload = await ApiService.resolveRegistrationInvite(
          serverOrigin: urlHit.origin,
          inviteToken: jwt,
        );
      } else if (looksLikeInviteJwt(raw)) {
        throw const FormatException(
          'Gescanntes Einladungs-JWT: bitte unter „Manuell“ die Server-URL eintragen und dort erneut scannen oder JWT einfügen.',
        );
      } else {
        payload = parseRegistrationPayload(raw);
      }
      await _registerWithPayload(payload);
    } catch (e) {
      if (mounted) {
        _showErrorSnack('${AppStrings.registrationFailed}$e');
      }
      await _resumeScanner();
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Widget _buildScannerTab() {
    if (Platform.isLinux) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'QR-Scanner ist auf Linux-Desktop nicht verfügbar.\n'
            'Nutzen Sie die Registerkarte „Manuell“ (JSON, Link aus E-Mail, oder Server-URL + Token).',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      );
    }
    return MobileScanner(
      controller: _scannerController!,
      onDetect: _onScanDetected,
    );
  }

  Widget _buildManualTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ExpansionTile(
            leading: const Icon(Icons.help_outline),
            title: const Text(AppStrings.registrationHelpTitle),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: [
              Text(
                AppStrings.registrationHelpBody,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Alternativ zum QR-Code: JSON wie im QR-Code, die Registrierungs-URL aus der E-Mail, '
            'ein Einladungs-JWT (mit Server-URL), oder Server-URL plus Geräte-Token aus dem Admin.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _manualPayloadController,
            maxLines: 5,
            decoration: InputDecoration(
              labelText: 'JSON, serverUrl|token, Registrierungs-Link oder JWT',
              border: const OutlineInputBorder(),
              hintText: '{"serverUrl":"https://…","token":"…"}',
              suffixIcon: IconButton(
                tooltip: 'Aus Zwischenablage',
                icon: const Icon(Icons.paste),
                onPressed: () async {
                  final data = await Clipboard.getData(Clipboard.kTextPlain);
                  final text = data?.text;
                  if (text != null && text.isNotEmpty) {
                    _manualPayloadController.text = text;
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _serverUrlController,
            decoration: const InputDecoration(
              labelText: 'Server-URL (z. B. für JWT oder Kurzform)',
              hintText: 'https://alarm.example.de',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _deviceTokenController,
            decoration: const InputDecoration(
              labelText: 'Geräte-Token (optional, wenn oben leer)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _isProcessing ? null : _submitManual,
            icon: const Icon(Icons.login),
            label: const Text('Registrieren'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alarm Messenger'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.qr_code_scanner), text: 'QR-Code'),
            Tab(icon: Icon(Icons.edit_note), text: 'Manuell'),
          ],
        ),
      ),
      body: _isProcessing
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
          : TabBarView(
              controller: _tabController,
              children: [
                _buildScannerTab(),
                _buildManualTab(),
              ],
            ),
    );
  }
}

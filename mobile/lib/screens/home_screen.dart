import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/strings.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../providers/theme_provider.dart';
import '../widgets/emergency_alarm_dialog.dart';
import '../widgets/emergency_card.dart';
import '../widgets/home_empty_state.dart';
import 'emergency_alert_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isDialogShowing = false;
  bool _appStateAlarmListenerAttached = false;
  AppState? _appStateRef;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadEmergencies());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _appStateRef = context.read<AppState>();
    if (!_appStateAlarmListenerAttached) {
      _appStateAlarmListenerAttached = true;
      _appStateRef!.addListener(_onAppStateAlarm);
    }
  }

  @override
  void dispose() {
    _appStateRef?.removeListener(_onAppStateAlarm);
    super.dispose();
  }

  void _onAppStateAlarm() {
    if (!mounted) return;
    final appState = _appStateRef ?? context.read<AppState>();
    if (appState.showAlarmDialog &&
        appState.currentEmergency != null &&
        !_isDialogShowing) {
      _isDialogShowing = true;
      final emergency = appState.currentEmergency!;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        await _showEmergencyDialog(context, emergency);
      });
    } else if (!appState.showAlarmDialog) {
      _isDialogShowing = false;
    }
  }

  Future<void> _loadEmergencies() async {
    final appState = Provider.of<AppState>(context, listen: false);
    await appState.loadEmergencies();
  }

  Future<void> _showEmergencyDialog(
    BuildContext context,
    Emergency emergency,
  ) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    final scheme = Theme.of(context).colorScheme;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) => EmergencyAlarmDialog(
        emergency: emergency,
      ),
    );

    _isDialogShowing = false;

    if (result != null && mounted) {
      try {
        await appState.submitResponse(result);

        if (mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text(
                result
                    ? '✓ Rückmeldung: Komme'
                    : '✓ Rückmeldung: Komme nicht',
              ),
              backgroundColor:
                  result ? scheme.primaryContainer : scheme.tertiaryContainer,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text('Fehler beim Senden der Rückmeldung: $e'),
              backgroundColor: scheme.error,
            ),
          );
        }
      }
    }
  }

  void _showInfoDialog(BuildContext context, AppState appState) {
    showDialog<void>(
      context: context,
      builder: (context) => HomeInfoDialog(appState: appState),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              appState.serverInfo?.organizationName ?? 'Alarm Messenger',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            if (appState.deviceDetails?.device.hasName ?? false)
              Text(
                appState.deviceDetails!.device.fullName,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: AppStrings.themeCycleTooltip,
            icon: Icon(
              switch (themeProvider.themeMode) {
                ThemeMode.system => Icons.brightness_auto,
                ThemeMode.light => Icons.light_mode,
                ThemeMode.dark => Icons.dark_mode,
              },
            ),
            onPressed: () => themeProvider.toggleTheme(),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'info') {
                _showInfoDialog(context, appState);
              } else if (value == 'logout') {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text(AppStrings.logout),
                    content: const Text(
                      'Möchten Sie sich wirklich abmelden? Sie müssen sich erneut registrieren.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Abbrechen'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Abmelden'),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && mounted) {
                  await appState.logout();
                }
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'info',
                child: Row(
                  children: [
                    Icon(Icons.info_outline),
                    SizedBox(width: 8),
                    Text('Informationen'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 8),
                    Text(AppStrings.logout),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (appState.isOffline)
            MaterialBanner(
              content: Text(
                AppStrings.offlineBanner,
                style: TextStyle(color: scheme.onSecondaryContainer),
              ),
              leading: Icon(Icons.cloud_off, color: scheme.onSecondaryContainer),
              backgroundColor: scheme.secondaryContainer,
              actions: [
                TextButton(
                  onPressed: () async {
                    await _loadEmergencies();
                    await appState.refreshInfo();
                  },
                  child: const Text(AppStrings.offlineRetry),
                ),
              ],
            ),
          if (appState.errorMessage != null)
            MaterialBanner(
              content: Text(appState.errorMessage!),
              leading: Icon(Icons.error_outline, color: scheme.onErrorContainer),
              backgroundColor: scheme.errorContainer,
              contentTextStyle: TextStyle(color: scheme.onErrorContainer),
              actions: [
                TextButton(
                  onPressed: appState.clearError,
                  child: Text(
                    'Schließen',
                    style: TextStyle(color: scheme.onErrorContainer),
                  ),
                ),
              ],
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await _loadEmergencies();
                await appState.refreshInfo();
              },
              child: appState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : appState.emergencies.isEmpty
                      ? HomeEmptyStateView(appState: appState)
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: appState.emergencies.length,
                          itemBuilder: (context, index) {
                            final emergency = appState.emergencies[index];
                            return EmergencyCard(
                              emergency: emergency,
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (context) => EmergencyAlertScreen(
                                      emergency: emergency,
                                      isHistoric: true,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

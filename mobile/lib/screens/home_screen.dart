import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../providers/theme_provider.dart';
import '../models/models.dart';
import 'emergency_alert_screen.dart';
import 'package:intl/intl.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isDialogShowing = false;

  @override
  void initState() {
    super.initState();
    _loadEmergencies();
  }

  Future<void> _loadEmergencies() async {
    final appState = Provider.of<AppState>(context, listen: false);
    await appState.loadEmergencies();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);

    // Show emergency alert dialog if there's a current emergency
    // Capture the emergency in a local variable to avoid race conditions
    final currentEmergency = appState.currentEmergency;
    if (currentEmergency != null && !_isDialogShowing) {
      _isDialogShowing = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showEmergencyDialog(context, currentEmergency);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              appState.serverInfo?.organizationName ?? 'Alarm Messenger',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (appState.deviceDetails?.device.hasName ?? false)
              Text(
                appState.deviceDetails!.device.fullName,
                style: const TextStyle(fontSize: 14),
              ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              themeProvider.themeMode == ThemeMode.light
                  ? Icons.dark_mode
                  : Icons.light_mode,
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
                    title: const Text('Abmelden'),
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
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'info',
                child: Row(
                  children: [
                    Icon(Icons.info_outline),
                    SizedBox(width: 8),
                    Text('Informationen'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 8),
                    Text('Abmelden'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _loadEmergencies();
          await appState.refreshInfo();
        },
        child: appState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : appState.emergencies.isEmpty
                ? _buildEmptyState(appState)
                : ListView.builder(
                    itemCount: appState.emergencies.length,
                    itemBuilder: (context, index) {
                      final emergency = appState.emergencies[index];
                      return _buildEmergencyCard(emergency);
                    },
                  ),
      ),
    );
  }

  Widget _buildEmptyState(AppState appState) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 32),
        Icon(
          Icons.check_circle_outline,
          size: 80,
          color: Colors.grey[400],
        ),
        const SizedBox(height: 16),
        Text(
          'Keine Einsätze',
          style: Theme.of(context).textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Sie werden bei neuen Einsätzen benachrichtigt',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        const Divider(),
        const SizedBox(height: 16),
        if (appState.deviceDetails != null) ...[
          _buildInfoSection(
            icon: Icons.person,
            title: 'Einsatzkraft',
            content: _buildDeviceInfo(appState.deviceDetails!),
          ),
          const SizedBox(height: 16),
        ],
        if (appState.serverInfo != null) ...[
          _buildInfoSection(
            icon: Icons.info_outline,
            title: 'Server-Informationen',
            content: _buildServerInfo(appState.serverInfo!),
          ),
        ],
      ],
    );
  }

  Widget _buildInfoSection({
    required IconData icon,
    required String title,
    required Widget content,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            content,
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceInfo(DeviceDetails details) {
    final device = details.device;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (device.firstName != null || device.lastName != null)
          _buildInfoRow('Name', device.fullName),
        if (device.leadershipRole != null && device.leadershipRole != 'none')
          _buildInfoRow('Führungsrolle', _getLeadershipRoleText(device.leadershipRole!)),
        if (device.qualifications != null &&
            device.qualifications!.getQualificationsList().isNotEmpty)
          _buildInfoRow(
            'Qualifikationen',
            device.qualifications!.getQualificationsList().join(', '),
          ),
        if (details.assignedGroups.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'Zugewiesene Gruppen:',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          ...details.assignedGroups.map((group) => Padding(
                padding: const EdgeInsets.only(left: 8, top: 4),
                child: Text(
                  '• ${group.code}: ${group.name}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              )),
        ],
        if (details.assignedGroups.isEmpty)
          Text(
            'Keine Gruppen zugewiesen',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
          ),
      ],
    );
  }

  Widget _buildServerInfo(ServerInfo info) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoRow('Organisation', info.organizationName),
        _buildInfoRow('Server-Version', info.serverVersion),
        _buildInfoRow('Server-URL', info.serverUrl),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  String _getLeadershipRoleText(String role) {
    switch (role) {
      case 'groupLeader':
        return 'Gruppenführer';
      case 'platoonLeader':
        return 'Zugführer';
      default:
        return 'Keine';
    }
  }

  void _showInfoDialog(BuildContext context, AppState appState) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Informationen'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (appState.deviceDetails != null) ...[
                Text(
                  'Einsatzkraft',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                _buildDeviceInfo(appState.deviceDetails!),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
              ],
              if (appState.serverInfo != null) ...[
                Text(
                  'Server-Informationen',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                _buildServerInfo(appState.serverInfo!),
              ],
              if (appState.deviceDetails != null) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Geräteinformationen',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                _buildInfoRow('Plattform', appState.deviceDetails!.device.platform),
                _buildInfoRow(
                  'Registriert seit',
                  DateFormat('dd.MM.yyyy HH:mm').format(
                    DateTime.parse(appState.deviceDetails!.device.registeredAt),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Schließen'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyCard(Emergency emergency) {
    final dateFormat = DateFormat('dd.MM.yyyy HH:mm');
    final date = DateTime.parse(emergency.emergencyDate);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => EmergencyAlertScreen(
                emergency: emergency,
                isHistoric: true,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: emergency.active ? Colors.red : Colors.grey,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          emergency.emergencyKeyword,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: emergency.active ? Colors.red : null,
                              ),
                        ),
                        Text(
                          '${emergency.emergencyNumber} • ${dateFormat.format(date)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (emergency.active)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'AKTIV',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                emergency.emergencyDescription,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      emergency.emergencyLocation,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showEmergencyDialog(BuildContext context, Emergency emergency) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) => _EmergencyAlertDialog(
        emergency: emergency,
      ),
    );

    // Reset dialog flag first
    _isDialogShowing = false;

    // Handle response
    if (result != null && mounted) {
      // Get appState before async gap
      final appState = Provider.of<AppState>(context, listen: false);
      // Get messenger before async gap
      final messenger = ScaffoldMessenger.of(context);
      
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
              backgroundColor: result ? Colors.green : Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text('Fehler beim Senden der Rückmeldung: $e'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }
}

class _EmergencyAlertDialog extends StatefulWidget {
  final Emergency emergency;

  const _EmergencyAlertDialog({
    required this.emergency,
  });

  @override
  State<_EmergencyAlertDialog> createState() => _EmergencyAlertDialogState();
}

class _EmergencyAlertDialogState extends State<_EmergencyAlertDialog> {
  bool _isSubmitting = false;

  void _submitResponse(bool participating) async {
    if (_isSubmitting) return;
    
    setState(() {
      _isSubmitting = true;
    });

    // Small delay to show the loading state
    await Future.delayed(const Duration(milliseconds: 300));
    
    if (mounted) {
      Navigator.of(context).pop(participating);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd.MM.yyyy HH:mm');
    final date = DateTime.parse(widget.emergency.emergencyDate);

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header with alarm icon
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.red,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.notifications_active,
                    color: Colors.white,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ALARM!',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          widget.emergency.emergencyKeyword,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Emergency details
                  _buildInfoItem(
                    Icons.label,
                    'Einsatznummer',
                    widget.emergency.emergencyNumber,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoItem(
                    Icons.access_time,
                    'Datum/Zeit',
                    dateFormat.format(date),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoItem(
                    Icons.description,
                    'Beschreibung',
                    widget.emergency.emergencyDescription,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoItem(
                    Icons.location_on,
                    'Einsatzort',
                    widget.emergency.emergencyLocation,
                  ),
                  
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),
                  
                  // Response question
                  const Text(
                    'Können Sie an diesem Einsatz teilnehmen?',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  
                  // Response buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isSubmitting ? null : () => _submitResponse(false),
                          icon: const Icon(Icons.close, size: 20),
                          label: const Text(
                            'KOMME NICHT',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isSubmitting ? null : () => _submitResponse(true),
                          icon: const Icon(Icons.check, size: 20),
                          label: const Text(
                            'KOMME',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  if (_isSubmitting)
                    const Padding(
                      padding: EdgeInsets.only(top: 16),
                      child: Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

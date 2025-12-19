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

    // Show emergency alert if there's a current emergency
    if (appState.currentEmergency != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => EmergencyAlertScreen(
              emergency: appState.currentEmergency!,
            ),
            fullscreenDialog: true,
          ),
        );
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
}

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../l10n/strings.dart';
import '../models/models.dart';
import '../providers/app_state.dart';

/// Empty list + device/server summary when there are no emergencies.
class HomeEmptyStateView extends StatelessWidget {
  const HomeEmptyStateView({super.key, required this.appState});

  final AppState appState;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 32),
        Icon(
          Icons.check_circle_outline,
          size: 80,
          color: scheme.outlineVariant,
        ),
        const SizedBox(height: 16),
        Text(
          AppStrings.noEmergencies,
          style: Theme.of(context).textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          AppStrings.homeEmptyNotify,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        const Divider(),
        const SizedBox(height: 16),
        if (appState.deviceDetails != null) ...[
          _InfoSection(
            icon: Icons.person,
            title: 'Einsatzkraft',
            child: _DeviceInfoContent(details: appState.deviceDetails!),
          ),
          const SizedBox(height: 16),
        ],
        if (appState.serverInfo != null)
          _InfoSection(
            icon: Icons.info_outline,
            title: 'Server-Informationen',
            child: _ServerInfoContent(info: appState.serverInfo!),
          ),
      ],
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
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
            child,
          ],
        ),
      ),
    );
  }
}

class _DeviceInfoContent extends StatelessWidget {
  const _DeviceInfoContent({required this.details});

  final DeviceDetails details;

  @override
  Widget build(BuildContext context) {
    final device = details.device;
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (device.firstName != null || device.lastName != null)
          _InfoRow(label: 'Name', value: device.fullName),
        if (device.leadershipRole != null && device.leadershipRole != 'none')
          _InfoRow(
            label: 'Führungsrolle',
            value: _leadershipRoleText(device.leadershipRole!),
          ),
        if (device.qualifications != null &&
            device.qualifications!.getQualificationsList().isNotEmpty)
          _InfoRow(
            label: 'Qualifikationen',
            value: device.qualifications!.getQualificationsList().join(', '),
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
          ...details.assignedGroups.map(
            (group) => Padding(
              padding: const EdgeInsets.only(left: 8, top: 4),
              child: Text(
                '• ${group.code}: ${group.name}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
        ],
        if (details.assignedGroups.isEmpty)
          Text(
            'Keine Gruppen zugewiesen',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontStyle: FontStyle.italic,
                ),
          ),
      ],
    );
  }

  static String _leadershipRoleText(String role) {
    switch (role) {
      case 'groupLeader':
        return 'Gruppenführer';
      case 'platoonLeader':
        return 'Zugführer';
      default:
        return 'Keine';
    }
  }
}

class _ServerInfoContent extends StatelessWidget {
  const _ServerInfoContent({required this.info});

  final ServerInfo info;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _InfoRow(label: 'Organisation', value: info.organizationName),
        _InfoRow(label: 'Server-Version', value: info.serverVersion),
        _InfoRow(label: 'Server-URL', value: info.serverUrl),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
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
}

/// Scrollable info dialog (menu „Informationen“).
class HomeInfoDialog extends StatelessWidget {
  const HomeInfoDialog({super.key, required this.appState});

  final AppState appState;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
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
              _DeviceInfoContent(details: appState.deviceDetails!),
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
              _ServerInfoContent(info: appState.serverInfo!),
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
              _InfoRow(
                label: 'Plattform',
                value: appState.deviceDetails!.device.platform,
              ),
              _InfoRow(
                label: 'Registriert seit',
                value: DateFormat('dd.MM.yyyy HH:mm').format(
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
    );
  }
}

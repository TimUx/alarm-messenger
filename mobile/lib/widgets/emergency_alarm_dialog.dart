import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';

/// Full-screen style alarm dialog shown when a new emergency requires response.
class EmergencyAlarmDialog extends StatefulWidget {
  const EmergencyAlarmDialog({super.key, required this.emergency});

  final Emergency emergency;

  @override
  State<EmergencyAlarmDialog> createState() => _EmergencyAlarmDialogState();
}

class _EmergencyAlarmDialogState extends State<EmergencyAlarmDialog> {
  bool _isSubmitting = false;

  Future<void> _submitResponse(bool participating) async {
    if (_isSubmitting) return;

    setState(() {
      _isSubmitting = true;
    });

    await Future<void>.delayed(const Duration(milliseconds: 200));

    if (mounted) {
      Navigator.of(context).pop(participating);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
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
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: scheme.error,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.notifications_active,
                    color: scheme.onError,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ALARM!',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: scheme.onError,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        Text(
                          widget.emergency.emergencyKeyword,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: scheme.onError,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _InfoItem(
                    icon: Icons.label,
                    label: 'Einsatznummer',
                    value: widget.emergency.emergencyNumber,
                  ),
                  const SizedBox(height: 12),
                  _InfoItem(
                    icon: Icons.access_time,
                    label: 'Datum/Zeit',
                    value: dateFormat.format(date),
                  ),
                  const SizedBox(height: 12),
                  _InfoItem(
                    icon: Icons.description,
                    label: 'Beschreibung',
                    value: widget.emergency.emergencyDescription,
                  ),
                  const SizedBox(height: 12),
                  _InfoItem(
                    icon: Icons.location_on,
                    label: 'Einsatzort',
                    value: widget.emergency.emergencyLocation,
                  ),
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),
                  Text(
                    'Können Sie an diesem Einsatz teilnehmen?',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _isSubmitting ? null : () => _submitResponse(false),
                          icon: const Icon(Icons.close, size: 20),
                          label: const Text(
                            'KOMME NICHT',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: scheme.tertiary,
                            foregroundColor: scheme.onTertiary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _isSubmitting ? null : () => _submitResponse(true),
                          icon: const Icon(Icons.check, size: 20),
                          label: const Text(
                            'KOMME',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: scheme.primary,
                            foregroundColor: scheme.onPrimary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_isSubmitting)
                    const Padding(
                      padding: EdgeInsets.only(top: 16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  const _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: scheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
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

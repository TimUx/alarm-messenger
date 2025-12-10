import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import 'package:intl/intl.dart';

class EmergencyAlertScreen extends StatefulWidget {
  final Emergency emergency;
  final bool isHistoric;

  const EmergencyAlertScreen({
    super.key,
    required this.emergency,
    this.isHistoric = false,
  });

  @override
  State<EmergencyAlertScreen> createState() => _EmergencyAlertScreenState();
}

class _EmergencyAlertScreenState extends State<EmergencyAlertScreen> {
  bool _isSubmitting = false;

  Future<void> _submitResponse(bool participating) async {
    if (widget.isHistoric) {
      Navigator.of(context).pop();
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final appState = Provider.of<AppState>(context, listen: false);
      await appState.submitResponse(participating);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              participating
                  ? '✓ Rückmeldung: Nehme teil'
                  : '✓ Rückmeldung: Kann nicht teilnehmen',
            ),
            backgroundColor: participating ? Colors.green : Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd.MM.yyyy HH:mm');
    final date = DateTime.parse(widget.emergency.emergencyDate);

    return Scaffold(
      backgroundColor: widget.isHistoric
          ? null
          : Theme.of(context).colorScheme.errorContainer,
      appBar: AppBar(
        backgroundColor: widget.isHistoric ? null : Colors.red,
        foregroundColor: widget.isHistoric ? null : Colors.white,
        title: Text(widget.isHistoric ? 'Einsatz-Details' : 'ALARM!'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!widget.isHistoric)
                      Icon(
                        Icons.notifications_active,
                        size: 80,
                        color: Colors.red[700],
                      ),
                    if (!widget.isHistoric) const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildInfoRow(
                              Icons.label,
                              'Einsatznummer',
                              widget.emergency.emergencyNumber,
                            ),
                            const Divider(height: 24),
                            _buildInfoRow(
                              Icons.access_time,
                              'Datum/Zeit',
                              dateFormat.format(date),
                            ),
                            const Divider(height: 24),
                            _buildInfoRow(
                              Icons.warning_amber,
                              'Stichwort',
                              widget.emergency.emergencyKeyword,
                            ),
                            const Divider(height: 24),
                            _buildInfoSection(
                              Icons.description,
                              'Beschreibung',
                              widget.emergency.emergencyDescription,
                            ),
                            const Divider(height: 24),
                            _buildInfoSection(
                              Icons.location_on,
                              'Einsatzort',
                              widget.emergency.emergencyLocation,
                            ),
                            if (widget.emergency.groups != null) ...[
                              const Divider(height: 24),
                              _buildInfoRow(
                                Icons.group,
                                'Gruppen',
                                widget.emergency.groups!,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (!widget.isHistoric)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Können Sie an diesem Einsatz teilnehmen?',
                      style: Theme.of(context).textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isSubmitting
                                ? null
                                : () => _submitResponse(false),
                            icon: const Icon(Icons.close),
                            label: const Text('NEIN'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.orange,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isSubmitting
                                ? null
                                : () => _submitResponse(true),
                            icon: const Icon(Icons.check),
                            label: const Text('JA'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
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

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSection(IconData icon, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: Colors.grey[600]),
            const SizedBox(width: 12),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.only(left: 32),
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ),
      ],
    );
  }
}

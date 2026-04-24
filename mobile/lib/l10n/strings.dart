class AppStrings {
  // Theme
  static const themeCycleTooltip = 'Darstellung wechseln: System, Hell, Dunkel';

  // Registration
  static const registering = 'Registrierung läuft...';
  static const registrationFailed = 'Registrierung fehlgeschlagen: ';
  static const registrationSuccess = '✓ Erfolgreich registriert';
  static const registrationTitle = 'Registrierung';
  static const registrationDescription = 'Scannen Sie den QR-Code, um sich zu registrieren.';
  static const registrationHelpTitle = 'Hilfe zur Registrierung';
  static const registrationHelpBody =
      '• QR-Tab: Code aus der Einladung scannen.\n'
      '• Manuell: JSON wie im QR, Registrierungs-Link aus der E-Mail, oder Einladungs-JWT plus Server-URL.\n'
      '• Alternativ: Server-URL und Geräte-Token aus dem Admin.\n'
      '• Linux: kein Kamera-Scanner – nur „Manuell“.';

  static const homeEmptyNotify = 'Sie werden bei neuen Einsätzen benachrichtigt';

  // Connection
  static const noConnection = 'Keine Verbindung zum Server. Bitte Netzwerk prüfen.';
  static const timeout = 'Zeitüberschreitung beim Laden.';
  static const offlineBanner = 'Offline – es werden gecachte Einsätze angezeigt.';
  static const offlineRetry = 'Erneut laden';

  // Emergency
  static const noEmergencies = 'Keine aktiven Einsätze';
  static const loadingEmergencies = 'Lade Einsätze...';
  static const emergencyAlert = 'ALARM';
  static const participating = 'Ich bin dabei';
  static const notParticipating = 'Ich bin nicht dabei';

  // General
  static const loading = 'Laden...';
  static const error = 'Fehler';
  static const retry = 'Wiederholen';
  static const logout = 'Abmelden';
  static const settings = 'Einstellungen';
}

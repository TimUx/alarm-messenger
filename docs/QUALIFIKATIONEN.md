# Qualifikationsänderungen

## Übersicht

Die Qualifikationsfelder für Einsatzkräfte wurden gemäß den neuen Anforderungen angepasst.

## Änderungen

### Entfernte Qualifikationen

Die folgenden Qualifikationen wurden entfernt:
- **TH-VU** (Technische Hilfe - Verkehrsunfall)
- **TH-BAU** (Technische Hilfe - Bau)

### Neue Führungsrollen

Das bisherige Feld "Führungskraft" (`isSquadLeader`) wurde durch ein neues Feld `leadershipRole` ersetzt, das drei Werte unterstützt:

1. **none** (Keine Führungsrolle) - Standard
2. **groupLeader** (Gruppenführer)
3. **platoonLeader** (Zugführer)

**Wichtig:** Es kann immer nur eine Führungsrolle gewählt werden (gegenseitig exklusiv).

## API-Änderungen

### Device-Registrierung

```json
{
  "deviceToken": "...",
  "registrationToken": "...",
  "platform": "android",
  "responderName": "Max Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "groupLeader"
}
```

### Device-Aktualisierung (Admin)

```http
PUT /api/admin/devices/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "responderName": "Max Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": true,
    "paramedic": false
  },
  "leadershipRole": "platoonLeader"
}
```

## Admin-Oberfläche

### Führungsrolle-Auswahl

Im Geräte-Bearbeitungsformular wurden die Checkboxen für "Führungskraft" durch Radio-Buttons ersetzt:

```
○ Keine
○ Gruppenführer
○ Zugführer
```

Es kann immer nur eine Option ausgewählt werden.

### Qualifikationen

Die Checkboxen für TH-VU und TH-BAU wurden entfernt. Verbleibende Qualifikationen:
- ☐ Maschinist
- ☐ AGT (Atemschutzgeräteträger)
- ☐ Sanitäter

## Datenbank-Migration

### Neue Felder

```sql
ALTER TABLE devices ADD COLUMN leadership_role TEXT DEFAULT 'none';
```

### Migration bestehender Daten

Für bestehende Geräte mit `is_squad_leader = 1` wird automatisch `leadership_role = 'groupLeader'` gesetzt.

**Hinweis:** Die alten Spalten `qual_th_vu`, `qual_th_bau` und `is_squad_leader` werden nicht gelöscht, um Abwärtskompatibilität zu gewährleisten. Sie werden jedoch von der Anwendung ignoriert.

## TypeScript-Typen

### Vor der Änderung

```typescript
interface Device {
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
    thVu: boolean;      // ❌ Entfernt
    thBau: boolean;     // ❌ Entfernt
  };
  isSquadLeader?: boolean;  // ❌ Entfernt
}
```

### Nach der Änderung

```typescript
interface Device {
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
  };
  leadershipRole?: 'none' | 'groupLeader' | 'platoonLeader';
}
```

## Anzeige in der Admin-Oberfläche

### Device-Karten

Die Führungsrolle wird mit entsprechenden Symbolen angezeigt:
- Gruppenführer: ⭐ Gruppenführer
- Zugführer: ⭐⭐ Zugführer
- Keine Rolle: (wird nicht angezeigt)

## Abwärtskompatibilität

Die Migration ist abwärtskompatibel:
- Bestehende Geräte mit `is_squad_leader = 1` werden automatisch zu "Gruppenführer" migriert
- Alte Datenbankspalten bleiben erhalten, werden aber ignoriert
- API akzeptiert weiterhin alte Qualifikationsfelder, ignoriert sie aber

## Beispiele

### Beispiel 1: Gruppenführer mit Maschinist-Qualifikation

```json
{
  "responderName": "Max Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "groupLeader"
}
```

### Beispiel 2: Zugführer mit mehreren Qualifikationen

```json
{
  "responderName": "Anna Schmidt",
  "qualifications": {
    "machinist": true,
    "agt": true,
    "paramedic": true
  },
  "leadershipRole": "platoonLeader"
}
```

### Beispiel 3: Einsatzkraft ohne Führungsrolle

```json
{
  "responderName": "Tom Weber",
  "qualifications": {
    "machinist": false,
    "agt": true,
    "paramedic": false
  },
  "leadershipRole": "none"
}
```

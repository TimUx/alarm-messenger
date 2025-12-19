class Emergency {
  final String id;
  final String emergencyNumber;
  final String emergencyDate;
  final String emergencyKeyword;
  final String emergencyDescription;
  final String emergencyLocation;
  final String createdAt;
  final bool active;
  final String? groups;

  Emergency({
    required this.id,
    required this.emergencyNumber,
    required this.emergencyDate,
    required this.emergencyKeyword,
    required this.emergencyDescription,
    required this.emergencyLocation,
    required this.createdAt,
    required this.active,
    this.groups,
  });

  factory Emergency.fromJson(Map<String, dynamic> json) {
    return Emergency(
      id: json['id'] as String,
      emergencyNumber: json['emergencyNumber'] as String,
      emergencyDate: json['emergencyDate'] as String,
      emergencyKeyword: json['emergencyKeyword'] as String,
      emergencyDescription: json['emergencyDescription'] as String,
      emergencyLocation: json['emergencyLocation'] as String,
      createdAt: json['createdAt'] as String,
      active: json['active'] as bool,
      groups: json['groups'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'emergencyNumber': emergencyNumber,
      'emergencyDate': emergencyDate,
      'emergencyKeyword': emergencyKeyword,
      'emergencyDescription': emergencyDescription,
      'emergencyLocation': emergencyLocation,
      'createdAt': createdAt,
      'active': active,
      'groups': groups,
    };
  }
}

class Device {
  final String id;
  final String deviceToken;
  final String registrationToken;
  final String platform;
  final String registeredAt;
  final bool active;
  final String? firstName;
  final String? lastName;
  final Qualifications? qualifications;
  final String? leadershipRole;
  final List<String>? assignedGroups;

  Device({
    required this.id,
    required this.deviceToken,
    required this.registrationToken,
    required this.platform,
    required this.registeredAt,
    required this.active,
    this.firstName,
    this.lastName,
    this.qualifications,
    this.leadershipRole,
    this.assignedGroups,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as String,
      deviceToken: json['deviceToken'] as String,
      registrationToken: json['registrationToken'] as String,
      platform: json['platform'] as String,
      registeredAt: json['registeredAt'] as String,
      active: json['active'] as bool,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      qualifications: json['qualifications'] != null
          ? Qualifications.fromJson(json['qualifications'] as Map<String, dynamic>)
          : null,
      leadershipRole: json['leadershipRole'] as String?,
      assignedGroups: json['assignedGroups'] != null
          ? List<String>.from(json['assignedGroups'] as List)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'deviceToken': deviceToken,
      'registrationToken': registrationToken,
      'platform': platform,
      'registeredAt': registeredAt,
      'active': active,
      'firstName': firstName,
      'lastName': lastName,
      'qualifications': qualifications?.toJson(),
      'leadershipRole': leadershipRole,
      'assignedGroups': assignedGroups,
    };
  }

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    } else if (firstName != null) {
      return firstName!;
    } else if (lastName != null) {
      return lastName!;
    }
    return 'Unbekannt';
  }
}

class Qualifications {
  final bool machinist;
  final bool agt;
  final bool paramedic;

  Qualifications({
    required this.machinist,
    required this.agt,
    required this.paramedic,
  });

  factory Qualifications.fromJson(Map<String, dynamic> json) {
    return Qualifications(
      machinist: json['machinist'] as bool? ?? false,
      agt: json['agt'] as bool? ?? false,
      paramedic: json['paramedic'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'machinist': machinist,
      'agt': agt,
      'paramedic': paramedic,
    };
  }

  List<String> getQualificationsList() {
    List<String> qualifications = [];
    if (machinist) qualifications.add('Maschinist');
    if (agt) qualifications.add('AGT');
    if (paramedic) qualifications.add('Sanitäter');
    return qualifications;
  }
}

class Group {
  final String code;
  final String name;
  final String? description;
  final String createdAt;

  Group({
    required this.code,
    required this.name,
    this.description,
    required this.createdAt,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'name': name,
      'description': description,
      'createdAt': createdAt,
    };
  }
}

class DeviceDetails {
  final Device device;
  final List<Group> assignedGroups;

  DeviceDetails({
    required this.device,
    required this.assignedGroups,
  });

  factory DeviceDetails.fromJson(Map<String, dynamic> json) {
    return DeviceDetails(
      device: Device.fromJson(json['device'] as Map<String, dynamic>),
      assignedGroups: (json['assignedGroups'] as List)
          .map((group) => Group.fromJson(group as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ServerInfo {
  final String organizationName;
  final String serverVersion;
  final String serverUrl;

  ServerInfo({
    required this.organizationName,
    required this.serverVersion,
    required this.serverUrl,
  });

  factory ServerInfo.fromJson(Map<String, dynamic> json) {
    return ServerInfo(
      organizationName: json['organizationName'] as String,
      serverVersion: json['serverVersion'] as String,
      serverUrl: json['serverUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'organizationName': organizationName,
      'serverVersion': serverVersion,
      'serverUrl': serverUrl,
    };
  }
}

class PushNotificationData {
  final String emergencyId;
  final String emergencyNumber;
  final String emergencyDate;
  final String emergencyKeyword;
  final String emergencyDescription;
  final String emergencyLocation;
  final String? groups;

  PushNotificationData({
    required this.emergencyId,
    required this.emergencyNumber,
    required this.emergencyDate,
    required this.emergencyKeyword,
    required this.emergencyDescription,
    required this.emergencyLocation,
    this.groups,
  });

  factory PushNotificationData.fromJson(Map<String, dynamic> json) {
    return PushNotificationData(
      emergencyId: json['emergencyId'] as String,
      emergencyNumber: json['emergencyNumber'] as String,
      emergencyDate: json['emergencyDate'] as String,
      emergencyKeyword: json['emergencyKeyword'] as String,
      emergencyDescription: json['emergencyDescription'] as String,
      emergencyLocation: json['emergencyLocation'] as String,
      groups: json['groups'] as String?,
    );
  }

  Emergency toEmergency() {
    return Emergency(
      id: emergencyId,
      emergencyNumber: emergencyNumber,
      emergencyDate: emergencyDate,
      emergencyKeyword: emergencyKeyword,
      emergencyDescription: emergencyDescription,
      emergencyLocation: emergencyLocation,
      createdAt: DateTime.now().toIso8601String(),
      active: true,
      groups: groups,
    );
  }
}

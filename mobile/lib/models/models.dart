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

  Device({
    required this.id,
    required this.deviceToken,
    required this.registrationToken,
    required this.platform,
    required this.registeredAt,
    required this.active,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as String,
      deviceToken: json['deviceToken'] as String,
      registrationToken: json['registrationToken'] as String,
      platform: json['platform'] as String,
      registeredAt: json['registeredAt'] as String,
      active: json['active'] as bool,
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

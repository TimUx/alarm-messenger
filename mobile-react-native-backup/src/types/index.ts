export interface Emergency {
  id: string;
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
  createdAt: string;
  active: boolean;
  groups?: string; // Comma-separated group codes
}

export interface Device {
  id: string;
  deviceToken: string;
  registrationToken: string;
  platform: 'ios' | 'android';
  registeredAt: string;
  active: boolean;
}

export interface PushNotificationData {
  emergencyId: string;
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
  groups?: string; // Comma-separated group codes
}

export interface Emergency {
  id: string;
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
  createdAt: string;
  active: boolean;
}

export interface Device {
  id: string;
  deviceToken: string;
  registrationToken: string;
  platform: 'ios' | 'android';
  registeredAt: string;
  active: boolean;
  // Responder information
  responderName?: string;
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
    thVu: boolean;
    thBau: boolean;
  };
  isSquadLeader?: boolean;
}

export interface Response {
  id: string;
  emergencyId: string;
  deviceId: string;
  participating: boolean;
  respondedAt: string;
}

export interface CreateEmergencyRequest {
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
}

export interface DeviceRegistrationRequest {
  registrationToken: string;
  platform: 'ios' | 'android';
  responderName?: string;
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
    thVu: boolean;
    thBau: boolean;
  };
  isSquadLeader?: boolean;
}

export interface EmergencyResponseRequest {
  deviceId: string;
  participating: boolean;
}

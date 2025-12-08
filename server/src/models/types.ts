export interface Emergency {
  id: string;
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
  createdAt: string;
  active: boolean;
  groups?: string; // Comma-separated group codes (e.g., "WIL26,SWA11")
}

export interface Device {
  id: string;
  deviceToken: string;
  registrationToken: string;
  platform: 'ios' | 'android';
  registeredAt: string;
  active: boolean;
  // Responder information
  firstName?: string;
  lastName?: string;
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
  };
  leadershipRole?: 'none' | 'groupLeader' | 'platoonLeader';
  assignedGroups?: string[]; // Array of group codes assigned to this device
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
  groups?: string; // Comma-separated group codes
}

export interface DeviceRegistrationRequest {
  registrationToken: string;
  platform: 'ios' | 'android';
  firstName?: string;
  lastName?: string;
  qualifications?: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
  };
  leadershipRole?: 'none' | 'groupLeader' | 'platoonLeader';
}

export interface EmergencyResponseRequest {
  deviceId: string;
  participating: boolean;
}

export interface Group {
  code: string; // Unique identifier (e.g., "WIL26")
  name: string;
  description?: string;
  createdAt: string;
}

export interface CreateGroupRequest {
  code: string;
  name: string;
  description?: string;
}

export interface ImportGroupsRequest {
  groups: Array<{
    code: string;
    name: string;
    description?: string;
  }>;
}

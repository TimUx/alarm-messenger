import { z } from 'zod';

export const CreateEmergencySchema = z.object({
  emergencyNumber: z.string().min(1).max(50),
  emergencyDate: z.string().min(1),
  emergencyKeyword: z.string().min(1).max(100),
  emergencyDescription: z.string().min(1).max(1000),
  emergencyLocation: z.string().min(1).max(500),
  groups: z.string().optional(),
});

export const DeviceRegistrationSchema = z.object({
  deviceToken: z.string().min(1),
  registrationToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  qualifications: z.object({
    machinist: z.boolean(),
    agt: z.boolean(),
    paramedic: z.boolean(),
  }).optional(),
  leadershipRole: z.enum(['none', 'groupLeader', 'platoonLeader']).optional(),
  fcmToken: z.string().optional().nullable(),
  apnsToken: z.string().optional().nullable(),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const CreateGroupSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const UpdatePushTokenSchema = z.object({
  deviceToken: z.string().min(1),
  fcmToken: z.string().optional().nullable(),
  apnsToken: z.string().optional().nullable(),
});

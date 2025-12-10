import axios from 'axios';
import { Emergency, Device } from '../types';

// Configure this with your actual server URL
const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deviceService = {
  async register(
    deviceToken: string,
    registrationToken: string,
    platform: 'ios' | 'android'
  ): Promise<Device> {
    const response = await api.post('/devices/register', {
      deviceToken,
      registrationToken,
      platform,
    });
    return response.data;
  },

  async getDevices(): Promise<Device[]> {
    const response = await api.get('/devices');
    return response.data;
  },
};

export const emergencyService = {
  async getEmergency(id: string): Promise<Emergency> {
    const response = await api.get(`/emergencies/${id}`);
    return response.data;
  },

  async submitResponse(
    emergencyId: string,
    deviceId: string,
    participating: boolean
  ): Promise<void> {
    await api.post(`/emergencies/${emergencyId}/responses`, {
      deviceId,
      participating,
    });
  },

  async getEmergencies(): Promise<Emergency[]> {
    const response = await api.get('/emergencies');
    return response.data;
  },
};

export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = `${url}/api`;
};

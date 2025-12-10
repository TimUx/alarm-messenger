import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_TOKEN_KEY = '@alarm_messenger_device_token';
const DEVICE_ID_KEY = '@alarm_messenger_device_id';
const SERVER_URL_KEY = '@alarm_messenger_server_url';
const THEME_MODE_KEY = '@alarm_messenger_theme_mode';

export const storageService = {
  async saveDeviceToken(token: string): Promise<void> {
    await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
  },

  async getDeviceToken(): Promise<string | null> {
    return await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
  },

  async saveDeviceId(id: string): Promise<void> {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  },

  async getDeviceId(): Promise<string | null> {
    return await AsyncStorage.getItem(DEVICE_ID_KEY);
  },

  async saveServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  },

  async getServerUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(SERVER_URL_KEY);
  },

  async saveThemeMode(mode: string): Promise<void> {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },

  async getThemeMode(): Promise<string | null> {
    return await AsyncStorage.getItem(THEME_MODE_KEY);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      DEVICE_TOKEN_KEY,
      DEVICE_ID_KEY,
      SERVER_URL_KEY,
      THEME_MODE_KEY,
    ]);
  },
};

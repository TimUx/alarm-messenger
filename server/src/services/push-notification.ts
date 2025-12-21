/**
 * Push Notification Service
 * 
 * This service provides a unified interface for sending push notifications
 * via Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs).
 * 
 * Features:
 * - Optional FCM support for Android devices
 * - Optional APNs support for iOS devices
 * - Graceful fallback to WebSocket if push tokens unavailable
 * - Self-hosted with local credentials (no cloud dependencies)
 * 
 * Configuration via environment variables:
 * - ENABLE_FCM: Set to 'true' to enable FCM
 * - FCM_SERVICE_ACCOUNT_PATH: Path to Firebase service account JSON file
 * - ENABLE_APNS: Set to 'true' to enable APNs
 * - APNS_KEY_PATH: Path to APNs .p8 key file
 * - APNS_KEY_ID: APNs Key ID
 * - APNS_TEAM_ID: Apple Team ID
 * - APNS_TOPIC: APNs bundle identifier (e.g., com.alarmmessenger)
 * - APNS_PRODUCTION: Set to 'true' for production APNs environment
 */

import * as admin from 'firebase-admin';
import apn from 'apn';
import fs from 'fs';
import path from 'path';

interface PushNotificationData {
  emergencyId: string;
  emergencyNumber: string;
  emergencyDate: string;
  emergencyKeyword: string;
  emergencyDescription: string;
  emergencyLocation: string;
  groups?: string;
}

class PushNotificationService {
  private fcmEnabled = false;
  private apnsEnabled = false;
  private apnsProvider: apn.Provider | null = null;

  constructor() {
    this.initializeFCM();
    this.initializeAPNs();
  }

  /**
   * Initialize Firebase Cloud Messaging (FCM)
   */
  private initializeFCM(): void {
    if (process.env.ENABLE_FCM !== 'true') {
      console.log('ℹ️  FCM push notifications disabled (set ENABLE_FCM=true to enable)');
      return;
    }

    try {
      const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccountPath) {
        console.warn('⚠️  FCM enabled but FCM_SERVICE_ACCOUNT_PATH not set');
        return;
      }

      if (!fs.existsSync(serviceAccountPath)) {
        console.warn(`⚠️  FCM service account file not found: ${serviceAccountPath}`);
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.fcmEnabled = true;
      console.log('✓ Firebase Cloud Messaging (FCM) initialized');
    } catch (error) {
      console.error('❌ Failed to initialize FCM:', error);
    }
  }

  /**
   * Initialize Apple Push Notification service (APNs)
   */
  private initializeAPNs(): void {
    if (process.env.ENABLE_APNS !== 'true') {
      console.log('ℹ️  APNs push notifications disabled (set ENABLE_APNS=true to enable)');
      return;
    }

    try {
      const keyPath = process.env.APNS_KEY_PATH;
      const keyId = process.env.APNS_KEY_ID;
      const teamId = process.env.APNS_TEAM_ID;
      const topic = process.env.APNS_TOPIC;
      const production = process.env.APNS_PRODUCTION === 'true';

      if (!keyPath || !keyId || !teamId || !topic) {
        console.warn('⚠️  APNs enabled but required environment variables not set');
        console.warn('     Required: APNS_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID, APNS_TOPIC');
        return;
      }

      if (!fs.existsSync(keyPath)) {
        console.warn(`⚠️  APNs key file not found: ${keyPath}`);
        return;
      }

      this.apnsProvider = new apn.Provider({
        token: {
          key: keyPath,
          keyId: keyId,
          teamId: teamId,
        },
        production: production,
      });

      this.apnsEnabled = true;
      console.log(`✓ Apple Push Notification service (APNs) initialized (${production ? 'production' : 'development'})`);
    } catch (error) {
      console.error('❌ Failed to initialize APNs:', error);
    }
  }

  /**
   * Send push notification via FCM (Android)
   */
  async sendFCMNotification(
    fcmToken: string,
    title: string,
    body: string,
    data: PushNotificationData
  ): Promise<boolean> {
    if (!this.fcmEnabled) {
      return false;
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type: 'emergency',
          emergencyId: data.emergencyId,
          emergencyNumber: data.emergencyNumber,
          emergencyDate: data.emergencyDate,
          emergencyKeyword: data.emergencyKeyword,
          emergencyDescription: data.emergencyDescription,
          emergencyLocation: data.emergencyLocation,
          groups: data.groups || '',
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'emergency_channel',
            priority: 'max' as const,
            sound: 'default',
            visibility: 'public' as const,
          },
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`✓ FCM notification sent to token: ${fcmToken.substring(0, 20)}...`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send FCM notification:`, error.message);
      return false;
    }
  }

  /**
   * Send push notification via APNs (iOS)
   */
  async sendAPNsNotification(
    apnsToken: string,
    title: string,
    body: string,
    data: PushNotificationData
  ): Promise<boolean> {
    if (!this.apnsEnabled || !this.apnsProvider) {
      return false;
    }

    try {
      const notification = new apn.Notification();
      
      // Critical alert for emergency notifications (bypasses Do Not Disturb)
      notification.sound = 'default';
      notification.badge = 1;
      notification.alert = {
        title: title,
        body: body,
      };
      
      // Set as critical alert with high interruption level
      notification.interruptionLevel = 'critical';
      
      // Add custom data
      notification.payload = {
        type: 'emergency',
        emergencyId: data.emergencyId,
        emergencyNumber: data.emergencyNumber,
        emergencyDate: data.emergencyDate,
        emergencyKeyword: data.emergencyKeyword,
        emergencyDescription: data.emergencyDescription,
        emergencyLocation: data.emergencyLocation,
        groups: data.groups || '',
      };
      
      // Set topic (bundle identifier)
      notification.topic = process.env.APNS_TOPIC || 'com.alarmmessenger';
      
      // Set expiration (notification expires after 1 hour if not delivered)
      notification.expiry = Math.floor(Date.now() / 1000) + 3600;
      
      // Set priority to immediate
      notification.priority = 10;

      const result = await this.apnsProvider.send(notification, apnsToken);
      
      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        console.error(`❌ Failed to send APNs notification: ${failure.response?.reason || 'Unknown error'}`);
        return false;
      }

      console.log(`✓ APNs notification sent to token: ${apnsToken.substring(0, 20)}...`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send APNs notification:`, error.message);
      return false;
    }
  }

  /**
   * Send push notification to a device based on available tokens
   * Tries FCM first (Android), then APNs (iOS)
   * Returns true if notification was sent successfully
   */
  async sendPushNotification(
    platform: string,
    fcmToken: string | null,
    apnsToken: string | null,
    title: string,
    body: string,
    data: PushNotificationData
  ): Promise<boolean> {
    // Try FCM for Android devices
    if (platform === 'android' && fcmToken && this.fcmEnabled) {
      return await this.sendFCMNotification(fcmToken, title, body, data);
    }

    // Try APNs for iOS devices
    if (platform === 'ios' && apnsToken && this.apnsEnabled) {
      return await this.sendAPNsNotification(apnsToken, title, body, data);
    }

    return false;
  }

  /**
   * Check if push notifications are available
   */
  isPushEnabled(): boolean {
    return this.fcmEnabled || this.apnsEnabled;
  }

  /**
   * Get push notification status
   */
  getStatus(): { fcm: boolean; apns: boolean } {
    return {
      fcm: this.fcmEnabled,
      apns: this.apnsEnabled,
    };
  }
}

export const pushNotificationService = new PushNotificationService();

import { dbRun, dbAll } from './database';
import logger from '../utils/logger';

/**
 * Emergency Scheduler Service
 * Handles automatic deactivation of emergencies after 1 hour
 */
class EmergencySchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute
  private readonly EMERGENCY_ACTIVE_DURATION = 3600000; // 1 hour in milliseconds

  /**
   * Start the scheduler to automatically deactivate old emergencies
   */
  start(): void {
    if (this.intervalId) {
      logger.info('Emergency scheduler already running');
      return;
    }

    logger.info('✓ Starting emergency scheduler (checking every 1 minute)');
    
    // Run immediately on start
    this.checkAndDeactivateEmergencies();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAndDeactivateEmergencies();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Emergency scheduler stopped');
    }
  }

  /**
   * Check for emergencies that need to be deactivated and deactivate them
   */
  private async checkAndDeactivateEmergencies(): Promise<void> {
    try {
      // Calculate the timestamp for 1 hour ago
      const oneHourAgo = new Date(Date.now() - this.EMERGENCY_ACTIVE_DURATION).toISOString();

      // Find all active emergencies created more than 1 hour ago
      const oldEmergencies = await dbAll(
        `SELECT id, emergency_number, emergency_keyword, created_at 
         FROM emergencies 
         WHERE active = 1 AND created_at < ?`,
        [oneHourAgo]
      );

      if (oldEmergencies.length > 0) {
        logger.info(`Found ${oldEmergencies.length} emergencies to deactivate:`);
        
        // Deactivate each old emergency
        for (const emergency of oldEmergencies) {
          await dbRun(
            'UPDATE emergencies SET active = 0 WHERE id = ?',
            [emergency.id]
          );
          
          const createdAt = new Date(emergency.created_at);
          const age = Math.floor((Date.now() - createdAt.getTime()) / 60000); // Age in minutes
          
          logger.info(
            `  ✓ Deactivated: ${emergency.emergency_number} - ${emergency.emergency_keyword} (age: ${age} minutes)`
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error in emergency scheduler');
    }
  }

  /**
   * Manually deactivate a specific emergency
   */
  async deactivateEmergency(emergencyId: string): Promise<boolean> {
    try {
      await dbRun(
        'UPDATE emergencies SET active = 0 WHERE id = ?',
        [emergencyId]
      );
      logger.info(`✓ Manually deactivated emergency: ${emergencyId}`);
      return true;
    } catch (error) {
      logger.error({ err: error }, `Error deactivating emergency ${emergencyId}`);
      return false;
    }
  }
}

export const emergencyScheduler = new EmergencySchedulerService();

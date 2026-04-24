import logger from '../../utils/logger';

interface SecretPolicyParams {
  envName: string;
  value: string;
  defaultValue: string;
  isProduction: boolean;
}

export function enforceSecretPolicy(params: SecretPolicyParams): void {
  const { envName, value, defaultValue, isProduction } = params;

  if (value === defaultValue) {
    const message = `⚠️  WARNING: ${envName} is using default value. Set a secure ${envName} in your .env file for production!`;
    logger.error(message);
    if (isProduction) {
      throw new Error(`${envName} must be set to a secure value in production environments`);
    }
    return;
  }

  if (value.length < 32) {
    const message = `⚠️  WARNING: ${envName} is too short (minimum 32 characters). Set a longer ${envName} in your .env file!`;
    logger.error(message);
    if (isProduction) {
      logger.error(`[FATAL] ${envName} is missing or too short (minimum 32 characters). Exiting.`);
      process.exit(1);
    }
  }
}

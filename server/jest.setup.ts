// Pre-set environment variables required by module-level constants in auth.ts
// before any test module imports are resolved.
process.env.API_SECRET_KEY = 'test-api-key';

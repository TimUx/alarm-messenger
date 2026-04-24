# Testing Strategy

This project now uses a layered test suite for the server:

- **Unit tests**: pure logic in helpers/services.
- **Integration tests**: route + middleware + in-memory SQLite behavior.
- **E2E tests**: full alarm lifecycle across multiple endpoints.

For mobile (Flutter), the suite includes:

- **Unit tests**: model and storage behavior.
- **Widget tests**: provider/UI interaction.
- **Integration smoke tests**: app-level core behavior checks.

## 1) Feature Analysis (App Surface)

Server feature areas covered by the suite:

- **Auth & access control**
  - JWT auth, API-key auth, session auth, CSRF enforcement.
- **Admin panel backend**
  - Bootstrap admin (`/api/admin/init`), login/logout, profile, emergency details.
- **Device lifecycle**
  - Registration token generation, device registration, push-token updates, self-access restrictions.
- **Emergency lifecycle**
  - Emergency creation, listing, response submission, participant/response retrieval.
- **Group management**
  - Create/update/delete/list groups, assign groups to devices.
- **Operational info**
  - Server metadata and dispatch metrics endpoint.
- **Core services**
  - Dispatch metrics aggregation and scheduler deactivation behavior.

## 2) Critical User Flows

Critical flows implemented as integration/E2E tests:

1. **First-time setup**
   - Initialize first admin user and establish authenticated session.
2. **Admin onboarding a responder device**
   - Generate registration QR token -> register device -> device becomes active.
3. **Emergency dispatch path**
   - Create emergency via API key -> responder submits participation response.
4. **Admin incident review**
   - Admin opens emergency details and receives participant summary/notification summary.
5. **Security boundaries**
   - Unauthorized access rejection, admin-only endpoints, device self-access enforcement.

## 3) Test Suite Structure

- `server/src/__tests__/unit`
  - `helpers.unit.test.ts`
  - `dispatch-metrics.unit.test.ts`
- `server/src/__tests__/integration`
  - `groups.integration.test.ts`
  - `info.integration.test.ts`
- `server/src/__tests__/e2e`
  - `alarm-flow.e2e.test.ts`
- Existing route-focused tests remain in `server/src/__tests__/*.test.ts`.
- `mobile/test/unit`
  - `models_test.dart`
  - `storage_service_test.dart`
- `mobile/test/widget`
  - `theme_provider_widget_test.dart`
- `mobile/integration_test`
  - `app_smoke_test.dart`

## 4) Local CLI Execution

Run from `server/`:

```bash
npm ci
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage:critical
npm run build
```

Single command for full suite:

```bash
npm run test:all
```

Run from `mobile/`:

```bash
flutter pub get
flutter test
flutter test integration_test
```

## 5) CI Execution

GitHub Actions (`.github/workflows/ci.yml`) runs:

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:e2e`
4. `npm run test:coverage:critical`
5. `npm run build`
6. `flutter analyze` (mobile)
7. `flutter test` (mobile)
8. `flutter test integration_test` (mobile)

This enforces layered correctness and a critical-path coverage gate on each push/PR.

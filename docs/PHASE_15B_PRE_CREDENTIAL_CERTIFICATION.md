# PHASE 15B: PRE-CREDENTIAL CERTIFICATION CHECK

## A. READY FOR CREDENTIAL INJECTION
**NO.**
The implementation contains severe structural gaps in testing fixtures and potential API endpoint configurations that must be resolved before credential injection will yield successful E2E results.

## B. HARD BLOCKERS BEFORE PUSHER
1. **Incomplete E2E Test Fixtures (`src/tests/e2e/internal-chat.spec.ts`)**: The current dual-browser test is completely commented out (`// await pageA.fill...`). It lacks a functional `loginUser` fixture to authenticate `contextA` and `contextB` into isolated sessions. Injecting Pusher credentials now will not result in a passing test.
2. **Missing E2E WebRTC Tests**: There are no corresponding E2E tests for the WebRTC call lifecycle in `src/tests/e2e/`. `internal-chat.spec.ts` only attempts text chat.
3. **Database Pre-Requisites**: The E2E tests assume `Alice Admin` and `Bob Employee` exist in the test DB, but there is no explicit DB seed step handling communication setup in the E2E script.

## C. PUSHER CONFIGURATION CONTRACT
To fulfill Phase 15B, the following environment variables MUST be supplied.
**Server-Side Only (NEVER exposed to browser):**
- `PUSHER_APP_ID`: Used by `src/lib/providers/realtime/pusher.provider.ts` to instantiate the Pusher API client.
- `PUSHER_SECRET`: Used to sign webhooks and authorize private channels via the server API routes.

**Client-Side (Exposed via `NEXT_PUBLIC_`):**
- `NEXT_PUBLIC_PUSHER_KEY`: Used by `pusher-js` in the browser to connect to the WebSocket.
- `NEXT_PUBLIC_PUSHER_CLUSTER`: Used by `pusher-js` for routing.

*Contract Verification:* The Pusher implementation must rely on an API route (e.g., `/api/pusher/auth`) to authorize subscriptions to `private-tenant-[id]` or `presence-tenant-[id]` channels, ensuring users can only subscribe to their own tenant's data.

## D. E2E PREREQUISITES (Dual-Browser Context)
For the E2E certification to pass, the environment must possess:
1. **Two Authenticated User Sessions**: Playwright must programmatically login User A (Employee) and User B (Admin) simultaneously without session collision. This requires Clerk testing tokens or a bypass fixture in the E2E setup.
2. **Shared Tenant Identity**: Both test users must belong to the same Tenant ID to communicate.
3. **Pusher Network Access**: The CI/CD runner executing Playwright must have outbound access to wss://ws-[cluster].pusher.com.

## E. TEST EXECUTION PLAN
Once credentials and E2E fixtures are corrected, the exact execution commands are:
1. `npm run test:e2e:db:start` (Ensure isolated test DB is running).
2. `npx prisma db push --force-reset` (Apply CallSession schema to test DB).
3. `npm run test:e2e:db:seed` (Seed Tenant, User A, User B).
4. `npx playwright test src/tests/e2e/internal-chat.spec.ts --project=chromium`
5. `npx playwright test src/tests/e2e/webrtc.spec.ts --project=chromium` (Once created).

## F. EXPECTED PASS CRITERIA
1. **Chat**: Message typed in Browser A appears in Browser B's DOM in < 2 seconds without a page refresh.
2. **Presence**: When Browser B logs in, Browser A sees Browser B's status change to "Online" via a `presence-` channel event.
3. **WebRTC**: Browser A initiates call -> Browser B sees "Incoming Call" modal -> Browser B accepts -> Both DOMs render `<video>` or `<audio>` streams (mocked or loopback media via Playwright `--use-fake-ui-for-media-stream`).
4. **Tenant Isolation**: User C in Tenant 2 cannot subscribe to or receive Tenant 1's events.

## G. REMAINING UNKNOWNs
1. **Clerk E2E Login Automation**: It is unknown if the current testing suite has a working bypass for Clerk's CAPTCHA/2FA mechanisms during Playwright execution.
2. **Attachment S3 Necessity**: The UI implies attachments can be sent in chat. It is unknown if the E2E tests strictly require a live S3 bucket to simulate an upload during the chat test, or if the mock storage provider safely intercepts it.
3. **CallSession Lifecycle API**: While `useWebRTCCall.ts` manages client state, it is unknown if the API routes correctly transition the `CallSession` DB model through `RINGING` -> `IN_PROGRESS` -> `COMPLETED` when signaling events fire.

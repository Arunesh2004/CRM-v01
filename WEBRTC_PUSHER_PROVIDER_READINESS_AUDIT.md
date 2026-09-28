# WebRTC/Pusher Provider Readiness Audit

## 1. Current Realtime Architecture
The application uses **Pusher** for signaling and **WebRTC** for peer-to-peer media transmission. A custom `PusherRealtimeAdapter` is implemented on the server to push events to designated private channels. On the client, the `useWebRTCCall` hook manages the RTCPeerConnection lifecycle, exchanging `offer`, `answer`, and `candidate` signals via authoritative server actions (`/api/communication/call/signaling`), which in turn relay them through Pusher.

## 2. Pusher Implementation
- **Server Configuration:** Uses `pusher` Node.js SDK initialized with `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, and `PUSHER_CLUSTER` from environment variables.
- **Client Configuration:** Uses `pusher-js` initialized with `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER`.
- **Channel Naming:** User-specific private channels following the pattern `private-tenant_${tenantId}_user_${userId}`.
- **Auth Endpoint:** Configured as `/api/realtime/auth`.
- **Events:** Uses custom events like `incoming-call`, `webrtc-offer`, `webrtc-answer`, and `webrtc-candidate`.
- **Fallback Handling:** If `NEXT_PUBLIC_PUSHER_KEY` is missing, the client fails gracefully with `REALTIME_PROVIDER_NOT_CONFIGURED` without breaking the application.

## 3. WebRTC Implementation
- **RTCPeerConnection:** Created by `useWebRTCCall.ts` with a hardcoded fallback STUN server (`stun:stun.l.google.com:19302`) if no explicit configuration is provided.
- **TURN Configuration:** **None currently implemented.** Production media bridging across restrictive NATs will likely fail.
- **Lifecycle:** 
  1. `initiateCall` (creates offer)
  2. `acceptCall` (creates answer)
  3. ICE candidate exchange
  4. Handled connection state changes (`connected`, `failed`, `disconnected`).
- **Hooks:** State is tightly integrated with a UI overlay (`WebRTCCallManager.tsx`) which shows incoming call rings, accepts, rejects, and end calls.

## 4. CallSession Implementation
- **Model:** `CallSession` exists in `database/schema.prisma` mapping to tenant, caller, recipient, status (`CallSessionStatus`), creation, expiration, and lifecycle timestamps.
- **Server Actions:** `initiateCallAction`, `acceptCallAction`, `rejectCallAction`, `markConnectedAction`, `endCallAction` handle DB state updates authoritatively.
- **Persistence:** All calls persist to the database ensuring reliable cross-device visibility and accurate call logs. 

## 5. Security Review
- **Tenant Isolation:** Enforced on the server (`/api/communication/call/signaling/route.ts`). Tenant identity is derived from the authenticated context. Private Pusher channels natively prevent cross-tenant subscriptions via the `/api/realtime/auth` endpoint.
- **Participant Authorization:** The signaling route explicitly verifies that the user is either the `callerId` or `recipientId` of the target `CallSession`. Arbitrary call IDs are rejected (403/404).
- **IDOR Protection:** `CallSession` lookups restrict visibility by `tenantId`. Terminal or expired calls are protected against retroactive signaling mutations (409 Conflict).
- **Secrets Management:** `PUSHER_SECRET` is strictly server-side. `NEXT_PUBLIC_PUSHER_KEY` is safely exposed to the client. There are no TURN secrets exposed yet since TURN is absent.
- **Media Authorization:** Because WebRTC is P2P, media streams inherently require both sides to accept the initial signaling handshake.

## 6. Migration State
- **Migration `20260916000000_add_production_call_session`:** 
  - **Status:** **UNVALIDATED / UNKNOWN**
  - **Reason:** The migration file and schema definitions exist in source control, but without direct DB access or credentials to the local/production PostgreSQL (`localhost:5435` unavailable), it cannot be physically verified.

## 7. Environment-Variable Contract
**Server-side:**
- `PUSHER_APP_ID` (Required)
- `PUSHER_KEY` (Required)
- `PUSHER_SECRET` (Required, strictly confidential)
- `PUSHER_CLUSTER` (Required)

**Client-side:**
- `NEXT_PUBLIC_PUSHER_KEY` (Required)
- `NEXT_PUBLIC_PUSHER_CLUSTER` (Required)

**Missing/Required:**
- TURN server URLs and credentials for production WebRTC reliability.

## 8. Provider Readiness Matrix

| Requirement | Code State | Configuration State | Production Evidence | Status |
|---|---|---|---|---|
| Pusher Server Credentials | Implemented | Pending | Unavailable | BLOCKED |
| Pusher Client Key | Implemented | Pending | Unavailable | BLOCKED |
| Pusher Cluster | Implemented | Pending | Unavailable | BLOCKED |
| Pusher Auth Endpoint | Implemented | Pending | Unavailable | BLOCKED |
| Signaling Channels | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| Tenant Isolation | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| Participant Authorization | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| CallSession Persistence | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| CallSession Migration | Implemented | Not Applicable | UNKNOWN | UNVALIDATED |
| WebRTC STUN | Implemented | Hardcoded (Google) | Unavailable | BLOCKED |
| WebRTC TURN | Absent | Absent | Absent | FAIL |
| RTCPeerConnection | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| Browser Media Permissions | Implemented | Not Applicable | Not Applicable | CODE VERIFIED ONLY |
| Two-user Test Identities | Absent | Absent | Absent | BLOCKED |

## 9. Missing Prerequisites
1. **Pusher Credentials:** Live production keys for the environment variables.
2. **TURN Server Credentials:** Live configuration for reliable P2P fallback.
3. **TURN Implementation:** Passing the TURN configuration into the `RTCPeerConnection` iceServers array.
4. **Valid Test Identities:** Two distinct active user accounts in the same tenant to test end-to-end calling.

## 10. Two-Identity Requirements
To test E2E calling, we require:
- **Peer A (Caller):** An active, authenticated employee belonging to Tenant A.
- **Peer B (Recipient):** A distinct active, authenticated employee belonging to the *exact same* Tenant A.
- The Demo Admin identity cannot be used simultaneously as both peers due to browser state and session isolation rules.

## 11. Exact Future E2E Test Plan
**DO NOT EXECUTE YET**

1. **Peer A** navigates to CRM and locates **Peer B**.
2. **Peer A** clicks "Initiate Call" (creates `CallSession` and `offer`).
3. **Peer A** awaits ringing state via Pusher.
4. **Peer B** receives `incoming-call` event and sees UI overlay.
5. **Peer B** clicks "Accept".
6. **Peer B** captures media, creates `answer`, and sends it to Peer A.
7. Both peers exchange ICE candidates.
8. `RTCPeerConnection` transitions to `connected`.
9. Server `markConnectedAction` is triggered.
10. Verify actual audio/video transmission between browsers.
11. **Peer A** clicks "End Call".
12. **Peer B** UI overlay automatically closes as state transitions to `ENDED`.
13. Verify final `CallSession` state in DB is `ENDED`.
14. Swap roles: Peer B initiates call to Peer A to verify bidirectional signaling.
15. Verify cross-tenant signaling is explicitly rejected (403/404).

## 12. Evidence Requirements
- Screenshots of the incoming call overlay (Peer B).
- Network logs showing successful Pusher subscription to private channels.
- Browser console logs demonstrating ICE candidate exchange and `connected` state.
- Final DB state confirmation indicating `CallSessionStatus.ENDED`.

## 13. Current Blockers
- Production Pusher credentials are not configured.
- WebRTC TURN configuration is absent in code and configuration.
- Two distinct active demo identities within the same tenant are not yet established.
- The CallSession database migration status in Production cannot be safely verified without read-access.

## 14. Recommended Next Action
**Recommendation:** Proceed to **Provider Configuration & Credential Injection**.
- **State:** Configuration-Ready (Code logic is sound, but blocked by missing secrets and TURN integration).
- **Why it comes next:** WebRTC testing physically cannot proceed without valid signaling infrastructure, and we have confirmed the local implementation is robust enough to warrant live provider injection.
- **Exact Preconditions:** Project owner must securely provide Pusher keys (App ID, Key, Secret, Cluster) and TURN server credentials, or describe the secure configuration mechanism to inject them into the Vercel production environment.
- **Stopping Conditions:** Once Vercel environment variables are populated, the next phase will verify Pusher connectivity before running the full E2E WebRTC test.

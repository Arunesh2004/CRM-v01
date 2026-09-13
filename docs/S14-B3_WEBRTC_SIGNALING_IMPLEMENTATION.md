# S14-B.3 WebRTC Signaling Implementation

## Status
IMPLEMENTED & VERIFIED (S14-B.3 phase).

## Overview
Phase S14-B.3 implemented the server-side signaling infrastructure required to establish WebRTC peer-to-peer connections. The system uses the existing `RealtimeAdapter` abstraction (Pusher) to relay strictly validated WebRTC signaling events between authenticated participants of an active `CallSession`.

This phase explicitly **avoids** implementing browser WebRTC concepts (STUN/TURN, ICE gathering, SDP generation, `RTCPeerConnection`), deferring those to Phase S14-B.4 (Client Implementation).

## Signaling Endpoint
**Route:** `POST /api/communication/call/signaling`

### Authentication & Authorization
- **Authentication:** Actor identity is derived strictly from server-side session context (`requireAuth()`, `requireTenant()`).
- **Participant Authorization:** The endpoint ensures the authenticated user is either the `callerId` or `recipientId` of the target `CallSession`.
- **Tenant Isolation:** Cross-tenant access is hard-blocked and returns `404 Not Found` to prevent leakage of call session existence.
- **Target Derivation:** The destination of the signaling event is entirely server-derived. If the caller sends a signal, it routes to the recipient. If the recipient sends a signal, it routes to the caller. Client-provided targets are explicitly ignored, preventing identity spoofing.

### Payload & Type Validation
- **Size Limit:** Max payload size is strictly enforced at 4KB. Oversized payloads return `413 Payload Too Large`.
- **Type Whitelist:** Only `offer`, `answer`, and `candidate` are accepted. Unknown types return `422 Unprocessable Entity`.
- **JSON Integrity:** Malformed JSON or non-object payloads are rejected.

### Lifecycle Enforcement
Signaling is intrinsically tied to the `CallSession` state machine:
- **Terminal Protection:** Signals sent against `ENDED`, `REJECTED`, `MISSED`, `FAILED`, or `EXPIRED` sessions are rejected (`409 Conflict`).
- **Offer Rules:** Only the caller may send an `offer`.
- **Answer Rules:** Only the recipient may send an `answer`, and only after the session has transitioned beyond `RINGING` (e.g., `ACCEPTED`).
- **Connected State:** The endpoint routes signaling payloads but intentionally **does not** automatically transition the `CallSession` to `CONNECTED`. `CONNECTED` implies successful peer-to-peer media establishment, which must be explicitly reported back by the client.

## Provider Relay
- **Abstraction:** The route uses `realtime.publishToUser(...)` from the application's provider abstraction. It avoids coupling directly to the Pusher SDK.
- **Envelope:** Events are wrapped in a strict server-generated envelope:
  ```json
  {
    "event": "webrtc-signal",
    "callId": "<UUID>",
    "type": "offer | answer | candidate",
    "payload": { ... },
    "senderId": "<AuthUser ID>"
  }
  ```
- **Degradation:** If the realtime provider is missing or fails (e.g., credentials absent), the API returns a controlled `503 Service Unavailable` with `REALTIME_PROVIDER_NOT_CONFIGURED`, explicitly preventing false success.

## Security Tests
Test suite: `src/tests/security/s14-b3-webrtc-signaling.test.ts`
Total Tests: 25 (All passing)

Coverage includes:
- Unauthenticated / Cross-tenant access
- Forged caller/target identities
- Non-participant access
- Strict CallSession status rules (rejected, expired, ended)
- Type enforcement (caller-only offer, recipient-only answer)
- Payload integrity and size limits
- Target spoofing prevention
- Provider failure degradation

## Next Steps
Proceed to **S14-B.4 (Browser WebRTC Client Implementation)**:
- Implement `RTCPeerConnection` lifecycle.
- Integrate Pusher client-side subscription for signaling events.
- Handle browser media tracks (Microphone/Camera).
- Send the final `markConnected` confirmation back to the API once ICE state completes.

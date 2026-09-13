# S14-B2 REALTIME IMPLEMENTATION PLAN

## 1. CallSession Model Proposal
To safely support WebRTC calling without breaking external `CallLog` telephony records, a dedicated `CallSession` table will be introduced. It represents the strictly authorized, ephemeral state machine of a WebRTC session.

**Proposed Model:**
```prisma
enum CallSessionStatus {
  RINGING
  ACCEPTED
  CONNECTED
  REJECTED
  MISSED
  ENDED
  FAILED
  EXPIRED
}

model CallSession {
  id              String            @id @default(uuid())
  tenantId        String
  callerId        String            // User ID of caller
  recipientId     String            // User ID of recipient
  status          CallSessionStatus @default(RINGING)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  expiresAt       DateTime          // Must be strictly enforced
  acceptedAt      DateTime?
  connectedAt     DateTime?
  endedAt         DateTime?
  failureReason   String?
  version         Int               @default(0) // Optimistic concurrency

  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  caller          User              @relation("CallCaller", fields: [callerId], references: [id])
  recipient       User              @relation("CallRecipient", fields: [recipientId], references: [id])

  @@index([tenantId, status])
  @@index([callerId, status])
  @@index([recipientId, status])
}
```

## 2. Call State Machine
- **RINGING**: Authorized Caller initiates. Server creates `CallSession` in `RINGING` and publishes the event. `expiresAt` is set to `now() + 60s`.
- **ACCEPTED**: Authorized Recipient accepts. Server updates state.
- **CONNECTED**: Authenticated Client (Caller/Recipient) explicitly confirms WebRTC connectivity to the server via API.
- **ENDED**: Authorized Participant terminates.
- **REJECTED**: Authorized Recipient declines.
- **MISSED**: System transitions `RINGING` -> `MISSED` via expiration.
- **FAILED**: Server signaling network failure / explicit client signaling crash.
- **EXPIRED**: System transitions an active state that timed out without progression.

## 3. Concurrency Model
**Atomic Versioning Required:**
The implementation MUST use atomic conditional state transitions utilizing Prisma's update capabilities.
```javascript
const updated = await prisma.callSession.updateMany({
  where: { id: sessionId, version: expectedVersion, status: expectedStatus },
  data: { status: newStatus, version: { increment: 1 } }
});
if (updated.count === 0) throw new ConcurrentModificationError();
```
Fetching and updating without the `where version` condition is strictly forbidden.

## 4. State Transition Authorization

| From | To | Authorized actor | Server checks |
|------|----|-------------------|---------------|
| `(none)` | `RINGING` | Caller | Caller authenticated, Caller/Recipient same tenant, Caller authorized, Unique active call constraint check |
| `RINGING` | `ACCEPTED` | Recipient ONLY | Session not expired, Recipient authenticated |
| `RINGING` | `REJECTED` | Recipient ONLY | Session not expired, Recipient authenticated |
| `RINGING` | `MISSED` | System | Transition via lazy expiry evaluation or worker |
| `RINGING` | `EXPIRED` | System | Expiration logic |
| `ACCEPTED` | `CONNECTED`| Caller/Recipient | Session not expired, Participant authenticated |
| `ACCEPTED` | `FAILED` | Server/Participant| Internal relay error or client crash |
| `CONNECTED`| `ENDED` | Caller/Recipient | Participant authenticated |
| `CONNECTED`| `FAILED` | Server/Participant| Network drop reported by client |

## 5. Expiration Model
- **Detection**: Eagerly evaluated upon any interaction attempt. E.g., if a client attempts to `ACCEPT` after `expiresAt`, the server atomically marks it `EXPIRED` instead. A periodic cleanup worker (using existing Inngest/BullMQ jobs) will sweep stale active sessions.
- **Resurrection**: Terminal states (`ENDED`, `REJECTED`, `MISSED`, `FAILED`, `EXPIRED`) can NEVER be transitioned back.

## 6. CallLog Idempotency
- **Relationship**: When a `CallSession` reaches a terminal status, a durable historical `CallLog` entry is generated.
- **Idempotency**: To prevent duplicate `CallLog` entries from concurrent/retry actions, `CallLog.providerCallId` MUST uniquely reference the `CallSession.id`. `upsert` mechanism will be used.

## 7. Active Call Policy
- **Policy**: An employee may only have ONE active call (either incoming or outgoing) at a time.
- **Enforcement**: Concurrency-safe check. Because standard `findFirst` followed by `create` is race-prone, the system will execute a serializable transaction or utilize a Redis-based distributed lock on the `userId` during call initiation to strictly prevent double-initiations.

## 8. Realtime Channel Contract
- `private-tenant_<tenantId>_user_<userId>`: Directed messaging, WebRTC signaling relay, direct notifications. 
  - **Auth**: Only the authenticated `<userId>` may subscribe.
  - **Publish**: Clients CANNOT publish client events. Server strictly publishes.
- `presence-tenant_<tenantId>_users`: Global tenant presence tracking.
  - **Auth**: Only authenticated employees of `<tenantId>` may subscribe.
- Unknown/malformed channels are explicitly rejected with HTTP 403.

## 9. Signaling Model
- **Transport**: STRICTLY Server-relayed Pusher events (`/api/communication/call/signaling`). NO raw Pusher client-events.
- **Target Derivation**: The target user is derived authoritatively from the DB `CallSession`, NEVER from the client request payload. The server ignores `targetUserId` if provided.

## 10. Payload Limits
- Payload size capped at 4KB.
- Validated via Zod strictly allowing `{ type: "offer" | "answer" | "candidate", sdp?: string, candidate?: object }`.
- Unknown/malformed fields stripped.

## 11. Provider Failure Semantics
- **Call Creation**: If `CallSession` creation succeeds but Pusher publish fails, the server marks `CallSession` as `FAILED` immediately and explicitly errors to the client. No ghost ringing.
- **Messaging/Notifications**: DB persistence is authoritative. Pusher is best-effort.

## 12. Provider Interface
- `RealtimeAdapter` remains minimal: `publishToUser(tenantId, userId, event, payload)` and `publishToChannel(tenantId, channelId, event, payload)`.
- The adapter does NOT perform authorization; it merely transports pre-authorized server traffic.

## 13. Security Threat Model
- **IDOR**: Prevented by server-side `CallSession` relationship checks. Target derived from server.
- **Cross-tenant**: Channel auth rejects foreign subscriptions. Database RLS (`withTenant`) rejects foreign sessions.
- **Identity Spoofing**: `callerId` pulled directly from secure session context.
- **Stale Replay**: Optimistic versioning and `expiresAt` drop stale signaling.

## 14. Credentials
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` are explicitly REQUIRED in `.env.local` for the `PusherRealtimeAdapter` to initialize. Handled via graceful degradation if absent.

## 15. Implementation Phases
**B2-Core**: CallSession schema, migration, Pusher server SDK installation, provider factory integration, realtime auth endpoint, secure CallSession state machine, server-relayed signaling.
**B2-Tests**: Security/concurrency/provider tests.
**B3**: Browser Pusher client, WebRTC peer connection, STUN/TURN, actual UI/audio.

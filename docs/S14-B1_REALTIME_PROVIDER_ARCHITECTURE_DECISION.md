# S14-B1 REALTIME PROVIDER ARCHITECTURE DECISION

## 1. Executive Decision
**ARCHITECTURE APPROVED — READY FOR IMPLEMENTATION**

The realtime architecture will utilize **Pusher** as the stateful WebSocket provider. Pusher will act strictly as an event bus and WebRTC signaling channel. It will not persist canonical state, nor will it handle actual media traffic. All persistent state remains in the CRM database, and all media flows peer-to-peer (or via TURN) over WebRTC.

## 2. Current Architecture
- **Adapter Interface**: A minimal `RealtimeAdapter` exists (`publishToUser`, `publishToChannel`).
- **Current Implementation**: `MockRealtimeAdapter` logs events to stdout. No WebSocket connection exists.
- **Vercel Serverless constraints**: The application backend is stateless and cannot maintain long-lived WebSocket connections natively.

## 3. Requirements
- **Tenant Isolation**: Crucial. Tenants must not intercept other tenants' events.
- **Company Deployment Isolation**: Crucial. Every commercial deployment must be able to use its own provider credentials entirely isolated from others.
- **WebRTC Signaling**: Must carry JSON-serialized SDP offers/answers and ICE candidates rapidly.
- **Presence**: Must support online/offline visibility of employees within a tenant.

## 4. Provider Comparison

| Criterion | Pusher | Ably |
|-----------|--------|------|
| **WebSocket** | Yes (Channels) | Yes (Pub/Sub) |
| **Presence** | Native Presence Channels | Native Presence |
| **Private channels** | Native Authenticated Channels | Token-based auth |
| **WebRTC signaling** | Excellent | Excellent |
| **Vercel compatibility** | Strong (REST API for publishing) | Strong (REST API) |
| **Multi-instance scale** | Global clusters available | Global edge network |
| **Tenant isolation** | Native (via channel prefixes) | Native (namespaces) |
| **Per-company deployment** | Easy: 4 env variables | Easy: 1 API Key |
| **Failure handling** | Client reconnects automatically | Client reconnects, history |
| **Operational complexity**| Very low | Low to Medium |

## 5. Recommended Provider
**Pusher Channels** is recommended.

**Why:** Pusher’s authentication model (Private and Presence channels) maps perfectly to a Vercel serverless backend. The client requests a subscription, the Vercel API route verifies auth and tenant context, and signs the request. Its footprint is extremely small, and configuring a new instance merely requires four environment variables (`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`). This aligns perfectly with the isolated deployment model.

## 6. Rejected Alternative
**Ably** was rejected. While Ably provides superior message durability and history playback out of the box, the architectural requirement dictates that the **Database** is authoritative for history, not the realtime provider. We do not need Ably's advanced history semantics, making Pusher’s simpler stateless pub/sub model a more direct fit.

## 7. Realtime Architecture
- **Namespace**: Channels are strictly prefixed by tenant ID (e.g., `private-tenant_<tenantId>_user_<userId>`).
- **Authorization**: The client hits `/api/realtime/auth`. The server validates the user's session, verifies they belong to the requested tenant, and signs the Pusher auth payload.
- **Delivery**: The server persists entities (Message, Notification) via Prisma, then calls `pusher.trigger()` via the REST API.
- **Client**: Subscribes to the authenticated channel.

## 8. Internal Calling Architecture
- **Initiation**: Employee A initiates a call. Server authorizes and creates a `CallSession` in `RINGING` state and relays the `incoming-call` event to B.
- **Signaling**: Client A sends a WebRTC Offer via the *Server Relay Route* `/api/communication/call/signaling`. The server verifies the `CallSession` and relays it to Employee B's private channel.
- **Accept**: Employee B accepts. Server updates state to `ACCEPTED`. Client B sends a WebRTC Answer via the *Server Relay Route*.
- **Connected**: The client explicitly confirms WebRTC connectivity to the server, updating the state to `CONNECTED`.
- **Media**: A direct WebRTC peer connection is established.

## 9. WebRTC Signaling Architecture
Signaling will strictly use **Server-Relayed Pusher Events**. Client events directly over Pusher are rejected as an authorization boundary, as they allow forging payloads. Signaling is POSTed to `/api/communication/call/signaling`, authorized against the active `CallSession`, and published by the server. 

## 10. STUN/TURN Requirements
- **STUN**: Public Google STUN servers (`stun:stun.l.google.com:19302`).
- **TURN**: Commercial TURN provider (Twilio Network Traversal Service or Metered) configurable via environment variables.

## 11. Security Model
- **Subscription**: Server-signed Private/Presence channels.
- **Signaling**: Validated via strict database active `CallSession`. The target user is derived authoritatively from the DB, NEVER from the client request.
- **Spoofing**: A user cannot subscribe to `private-tenant_X` if their active session belongs to `tenant_Y`. The server auth route explicitly validates this boundary.

## 12. Tenant Isolation
Strict channel naming conventions (`private-tenant_<tenantId>_*`) ensure messages are isolated. The server boundary ensures events published from the backend only go to the correct tenant string.

## 13. Failure Semantics
- **Database Authoritative**: If Pusher is down, chat messages and notifications still persist in the database.
- **Signaling Failure**: If Pusher is down, WebRTC signaling REST relays fail. The `CallSession` is marked FAILED explicitly. No ghost calls.

## 14. Multi-instance/Scaling Model
Since Vercel is stateless, any Vercel function instance can independently issue a `pusher.trigger()` HTTP request. Fan-out to connected clients is handled entirely by Pusher's infrastructure.

## 15. Per-company Deployment Model
Each deployed CRM instance defines its own Pusher environment variables. Company A's events never traverse Company B's Pusher cluster.

## 16. Credential Requirements
Requires:
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`

## 17. Testing Strategy
- **Security Tests**: Validate that `/api/realtime/auth` rejects forged tenant IDs.
- **Signaling Tests**: Unit test the frontend WebRTC state machine transitions and server relay boundary.

## 18. Implementation Phases
**B2-Core**: CallSession schema, migration, Pusher adapter, realtime auth endpoint, CallSession service/state machine, secure call-control endpoints, server-relayed signaling.
**B2-Tests**: Security/concurrency/provider tests.
**B3**: Browser Pusher client, WebRTC peer connection, STUN/TURN, actual UI/audio.

## 19. Explicit Non-Goals
- We are NOT building an SFU (Selective Forwarding Unit) media server.
- We are NOT implementing video conferencing (just 1-on-1 audio for internal calls).

## 20. Exact Next Implementation Step
Finalize the CallSession schema and exact security transitions in `docs/S14-B2_REALTIME_IMPLEMENTATION_PLAN.md`.

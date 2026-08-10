# Phase R.13 Internal Chat Architecture Audit

## Current State

- **Existing User model**: Centralized via Clerk ID, strictly scoped to a `tenantId`. Roles are managed via `UserRole`.
- **Existing Tenant model**: Root isolation level for all data entities. Fully operational with `tenantId` indexes.
- **Existing Notification model**: `Notification` and `NotificationPreference` exist for `ALERT`, `REMINDER`, `SYSTEM`. No specific `CHAT` type yet.
- **Existing Activity Timeline**: Used heavily by CRM (Customers, Leads). Designed for system/audit tracking rather than high-frequency real-time human chat.
- **Existing Communication models**: 
  - `Conversation` currently has `type` (`INTERNAL`, `WHATSAPP`) and links to a `Customer`. Lacks many-to-many participant linkages for internal chat.
  - `Message` currently links to `Conversation`, has `senderId` (User), and handles `status` (`QUEUED`, `SENT`, etc.). Connects to `MessageAttachment` and `MessageReadStatus`.
  - Missing `ConversationMember` entirely to map employees to a chat room.

## Required Changes

### New Database Models needed
- **`ConversationMember`**: Required to map users to specific conversations with roles (`ADMIN`, `MEMBER`).
- **Enums**: `ConversationType` needs updating or a new enum (`DIRECT`, `GROUP`, `CHANNEL`) needs to be implemented. 

### Existing Models that can be reused
- **`Conversation`**: Can be expanded to include `createdBy` and `ConversationMember` relations.
- **`Message`**: Can be fully reused as it already has `content`, `tenantId`, `conversationId`, `senderId`. Need to add `messageType` (`TEXT`, `FILE`, `SYSTEM`) or expand existing enums.
- **`MessageReadStatus`**: Fully reusable.
- **`MessageAttachment`**: Fully reusable.

### Service Layer Requirements
- **Directory**: `src/modules/chat/`
- **Files**: `chat.service.ts`, `conversation.service.ts`, `message.service.ts`, `chat.permissions.ts`, `chat.events.ts`.
- **Logic**: Strict tenant scope on all operations. Validations to ensure users can only message within their tenant.

### UI Requirements
- **Directory**: `/chat` route.
- **Layout**: Sidebar (Chats, Groups, Channels) + Center Chat Window + Optional Context Panel.
- **Mobile**: Responsive stack that collapses sidebar into a menu or primary screen.
- **Features**: Infinite scroll (cursor-pagination) for older messages. Realtime UI updates via websocket connections.

### Realtime Requirements
- **Abstraction Layer**: `src/infrastructure/realtime/` with `interfaces.ts` and `factory.ts`.
- **Implementation**: `DemoRealtimeProvider` (using simulated delays, intervals, or basic local API polling/SSE for development), with future-proofing for Supabase Realtime, Pusher, etc.
- **Pattern**: Environment variable driven initialization.

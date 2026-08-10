# DATABASE MIGRATION DRY RUN (PHASE 6.0)

## Schema Alterations
1. **Model:** `Tenant`
   - Modify: `status TenantStatus @default(ACTIVE)` (Updating enum `PENDING` -> `DELETED` & `DELETION_REQUESTED`).
   - Add: `deletedAt DateTime?`
   - Add: `deletedById String?`
   - Add: `deletionReason String?`
2. **Models:** `User`, `Role`, `Message`, `Conversation`, `Call`, `Recording`, `Transcript`, `AISummary`, `Incident`, `Camera`, `AIEvent`, `Subscription`, `Invoice`, `Payment`
   - Add: `deletedAt DateTime?` 
   - Note: Only models requiring distinct business lifecycle recovery or compliance retention are granted this field. Pure join tables (`UserRole`) do not need `deletedAt`.

## Foreign Key Changes
- Remove `onDelete: Cascade` from `Tenant` relation in all models specified in the Cascade Decision Matrix (User, Customer, Role, Message, Call, Subscription, etc.).
- Default constraint becomes `Restrict/No Action` depending on DB dialect. Since we are no longer physically deleting `Tenant` rows, this constraint behaves safely (no integrity violation is triggered by a soft delete).

## Migration Risks & Rollback Strategy
**Risk:** Reverting `onDelete: Cascade` does not retroactively recover previously hard-deleted data.
**Rollback:** The migration adds nullable columns (`deletedAt`). Rolling back simply drops these columns and reinstates the `ON DELETE CASCADE` SQL constraint. 

**Conclusion:** The migration is structurally non-destructive. It exclusively *adds* data preservation capabilities.

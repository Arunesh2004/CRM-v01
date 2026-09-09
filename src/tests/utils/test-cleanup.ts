import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';

/**
 * A centralized, reusable test cleanup mechanism.
 * This helper uses `executeAsSystem` (with SystemOperation.DEMO_SEED or SECURITY_AUDIT) 
 * to bypass RLS during test fixture teardown, avoiding false-positive RLS failures.
 * 
 * It deletes records in strict dependency order (Child -> Parent -> Tenant) 
 * to satisfy Postgres foreign key constraints.
 * 
 * @param tenantIds List of tenant IDs to wipe data for.
 */
export async function wipeTestTenants(tenantIds: string[]) {
  if (tenantIds.length === 0) return;

  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    const where = { tenantId: { in: tenantIds } };

    // 1. Workflow & Tickets (Deepest dependencies)
    if (tx.workflowExecutionStep) await tx.workflowExecutionStep.deleteMany({ where });
    if (tx.workflowExecution) await tx.workflowExecution.deleteMany({ where });
    if (tx.workflowAction) await tx.workflowAction.deleteMany({ where });
    if (tx.workflowTrigger) await tx.workflowTrigger.deleteMany({ where });
    if (tx.workflow) await tx.workflow.deleteMany({ where });

    if (tx.ticketMessage) await tx.ticketMessage.deleteMany({ where });
    if (tx.ticket) await tx.ticket.deleteMany({ where });
    if (tx.sLAEvent) await tx.sLAEvent.deleteMany({ where });
    if (tx.sLAConfiguration) await tx.sLAConfiguration.deleteMany({ where });

    // 2. Communication & Collaboration
    if (tx.cRMComment) await tx.cRMComment.deleteMany({ where });
    if (tx.mailDraft) await tx.mailDraft.deleteMany({ where });
    if (tx.mailMessage) await tx.mailMessage.deleteMany({ where });
    if (tx.mailRecipient) await tx.mailRecipient.deleteMany({ where });
    if (tx.mailThread) await tx.mailThread.deleteMany({ where });
    if (tx.chatMessage) await tx.chatMessage.deleteMany({ where });
    if (tx.chatReadReceipt) await tx.chatReadReceipt.deleteMany({ where });
    if (tx.chatParticipant) await tx.chatParticipant.deleteMany({ where });
    if (tx.chatConversation) await tx.chatConversation.deleteMany({ where });
    if (tx.meetingParticipant) await tx.meetingParticipant.deleteMany({ where });
    if (tx.meeting) await tx.meeting.deleteMany({ where });
    if (tx.callLog) await tx.callLog.deleteMany({ where });
    if (tx.communicationAttachment) await tx.communicationAttachment.deleteMany({ where });
    if (tx.activityTimeline) await tx.activityTimeline.deleteMany({ where });

    // 3. AI, Documents, & Storage
    if (tx.documentEmbedding) await tx.documentEmbedding.deleteMany({ where });
    if (tx.documentPermission) await tx.documentPermission.deleteMany({ where });
    if (tx.demoStorage) await tx.demoStorage.deleteMany({ where });
    if (tx.document) await tx.document.deleteMany({ where });
    if (tx.aIMemory) await tx.aIMemory.deleteMany({ where });
    if (tx.aIAgentExecution) await tx.aIAgentExecution.deleteMany({ where });
    if (tx.aIReference) await tx.aIReference.deleteMany({ where });
    if (tx.aITokenUsage) await tx.aITokenUsage.deleteMany({ where });
    if (tx.aIConversationMessage) await tx.aIConversationMessage.deleteMany({ where });
    if (tx.aIConversation) await tx.aIConversation.deleteMany({ where });
    if (tx.aIExecution) await tx.aIExecution.deleteMany({ where });
    if (tx.aIProviderConfig) await tx.aIProviderConfig.deleteMany({ where });

    // 4. CCTV & Webhooks
    if (tx.recording) await tx.recording.deleteMany({ where });
    if (tx.cameraStream) await tx.cameraStream.deleteMany({ where });
    if (tx.cameraEvent) await tx.cameraEvent.deleteMany({ where });
    if (tx.cameraCredential) await tx.cameraCredential.deleteMany({ where });
    if (tx.camera) await tx.camera.deleteMany({ where });
    if (tx.incident) await tx.incident.deleteMany({ where });
    if (tx.aIEvent) await tx.aIEvent.deleteMany({ where });
    if (tx.webhookEvent) await tx.webhookEvent.deleteMany({ where });

    // 5. CRM & Sales Data
    if (tx.task) await tx.task.deleteMany({ where });
    if (tx.dealSnapshot) await tx.dealSnapshot.deleteMany({ where });
    if (tx.dealStageHistory) await tx.dealStageHistory.deleteMany({ where });
    if (tx.deal) await tx.deal.deleteMany({ where });
    if (tx.pipelineStage) await tx.pipelineStage.deleteMany({ where });
    if (tx.pipeline) await tx.pipeline.deleteMany({ where });
    if (tx.quoteLineItem) await tx.quoteLineItem.deleteMany({ where });
    if (tx.quote) await tx.quote.deleteMany({ where });
    if (tx.approvalStep) await tx.approvalStep.deleteMany({ where });
    if (tx.approvalRequest) await tx.approvalRequest.deleteMany({ where });
    if (tx.priceBookEntry) await tx.priceBookEntry.deleteMany({ where });
    if (tx.priceBook) await tx.priceBook.deleteMany({ where });
    if (tx.discountRule) await tx.discountRule.deleteMany({ where });
    if (tx.product) await tx.product.deleteMany({ where });
    if (tx.productFamily) await tx.productFamily.deleteMany({ where });
    if (tx.productCategory) await tx.productCategory.deleteMany({ where });
    if (tx.salesQuota) await tx.salesQuota.deleteMany({ where });
    if (tx.userTerritory) await tx.userTerritory.deleteMany({ where });
    if (tx.territory) await tx.territory.deleteMany({ where });
    if (tx.lead) await tx.lead.deleteMany({ where });
    if (tx.location) await tx.location.deleteMany({ where });
    if (tx.customerContact) await tx.customerContact.deleteMany({ where });
    if (tx.customer) await tx.customer.deleteMany({ where });

    // 6. Users, Roles, Security
    if (tx.deviceSession) await tx.deviceSession.deleteMany({ where });
    if (tx.userPresence) await tx.userPresence.deleteMany({ where });
    if (tx.notificationPreference) await tx.notificationPreference.deleteMany({ where });
    if (tx.notification) await tx.notification.deleteMany({ where });
    if (tx.userInvitation) await tx.userInvitation.deleteMany({ where });
    if (tx.userRole) await tx.userRole.deleteMany({ where });
    if (tx.rolePermission) await tx.rolePermission.deleteMany({ where });
    if (tx.role) await tx.role.deleteMany({ where });
    if (tx.user) await tx.user.deleteMany({ where });
    if (tx.department) await tx.department.deleteMany({ where });
    
    // 7. Infrastructure
    if (tx.idempotencyKey) await tx.idempotencyKey.deleteMany({ where });
    if (tx.deadLetterQueue) await tx.deadLetterQueue.deleteMany({ where });
    if (tx.eventOutbox) await tx.eventOutbox.deleteMany({ where });
    // auditLog is append-only with a DB trigger; cannot be deleted
    if (tx.tenantIntegration) await tx.tenantIntegration.deleteMany({ where });
    if (tx.tenantPhoneNumber) await tx.tenantPhoneNumber.deleteMany({ where });
    if (tx.tenantBootstrap) await tx.tenantBootstrap.deleteMany({ where });
    if (tx.securityEvent) await tx.securityEvent.deleteMany({ where });
    
    // 8. The Tenant
    try {
      if (tx.tenant) await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    } catch (err) {
      console.warn('Could not delete some tenants (possibly due to immutable AuditLogs):', err.message);
    }
  });
}

# Batch 2 Inventory: no-explicit-any

## Communication & WebRTC
| File | Line | Snippet |
|---|---|---|
| src/components\communication\ChatInterface.tsx | 9 | const [conversations, setConversations] = useState<any[]>([]); |
| src/components\communication\ChatInterface.tsx | 11 | const [messages, setMessages] = useState<any[]>([]); |
| src/components\communication\ChatInterface.tsx | 52 | channel.bind('new_message', (data: any) => { |

## Core & Queue
| File | Line | Snippet |
|---|---|---|
| src/lib\queue\inngest.client.ts | 25 | data: SecureJobEnvelope<any>; |

## Webhooks & Middleware
| File | Line | Snippet |
|---|---|---|
| src/middleware.ts | 194 | export default async function middleware(request: NextRequest, event: any) { |

## Other
| File | Line | Snippet |
|---|---|---|
| src/app\(crm)\admin\approvals\page.tsx | 32 | {approvals.map((approval: any) => ( |
| src/app\(crm)\admin\audit\page.tsx | 41 | {logs?.map((log: any) => ( |
| src/app\(crm)\admin\field-security\page.tsx | 40 | {configs?.map((config: any) => ( |
| src/app\(crm)\admin\field-security\page.tsx | 48 | {config.rules?.map((rule: any) => ( |
| src/app\(crm)\admin\permissions\page.tsx | 40 | {roles?.map((role: any) => ( |
| src/app\(crm)\admin\users\page.tsx | 41 | {users?.map((user: any) => ( |
| src/app\(crm)\admin\workflows\page.tsx | 40 | {workflows?.map((wf: any) => ( |
| src/app\(crm)\approvals\page.tsx | 36 | {approvals?.map((quote: any) => ( |
| src/app\(crm)\assistant\page.tsx | 267 | {msg.tools.map((t: any, idx: number) => renderToolResult(t, idx))} |
| src/app\(crm)\communication\mail\[id]\page.tsx | 63 | <span>To: {message.recipients.filter((r: any) => r.type === 'TO').map((r: any) => r.user.email).join(', ')}</span> |
| src/app\(crm)\communication\mail\[id]\page.tsx | 63 | <span>To: {message.recipients.filter((r: any) => r.type === 'TO').map((r: any) => r.user.email).join(', ')}</span> |
| src/app\(crm)\communication\mail\[id]\page.tsx | 65 | {message.recipients.some((r: any) => r.type === 'CC') && ( |
| src/app\(crm)\customers\[id]\DocumentsTabWrapper.tsx | 19 | <DocumentList documents={documents as any} customerId={customerId} /> |
| src/app\(crm)\customers\page.tsx | 123 | {customers.map((customer: any) => ( |
| src/app\(crm)\dashboard\page.tsx | 201 | {recentActivities.map((activity: any, idx: number) => { |
| src/app\(crm)\deals\DealKanbanBoard.tsx | 118 | // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload — typed Prisma/API result shape requires architectural schema work deferred to S3 |
| src/app\(crm)\deals\DealKanbanBoard.tsx | 237 |  |
| src/app\(crm)\departments\page.tsx | 30 | {departments.map((dept: any) => ( |
| src/app\(crm)\departments\page.tsx | 49 | <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{(dept as any)._count?.users \|\| 0} Employees</span> |
| src/app\(crm)\employees\[employeeId]\page.tsx | 78 | {employee.userRoles.map((r: any) => r.role.name.replace('_', ' ')).join(', ')} |
| src/app\(crm)\employees\page.tsx | 60 | {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)} |
| src/app\(crm)\employees\page.tsx | 83 | {employees.map((emp: any) => ( |
| src/app\(crm)\employees\page.tsx | 109 | {emp.userRoles.map((ur: any) => ( |
| src/app\(crm)\incidents\page.tsx | 67 | {incidents.map((incident: any) => ( |
| src/app\(crm)\locations\page.tsx | 68 | {locations.map((location: any) => ( |
| src/app\(crm)\monitoring\page.tsx | 37 | {cameras.map((camera: any) => ( |
| src/app\(crm)\products\ProductsClient.tsx | 120 | {products?.map((product: any) => ( |
| src/app\(crm)\quotes\[id]\page.tsx | 87 | {quote.lineItems?.map((item: any) => ( |
| src/app\(crm)\quotes\page.tsx | 61 | {quotes?.map((quote: any) => ( |
| src/app\(crm)\settings\integrations\page.tsx | 198 | <Button variant="ghost" size="icon" className="bg-white/5 hover:bg-white/10 hover:text-cyan-400" onClick={() => handleTestConnection(providerDef.id as any)} title="Test Connection"> |
| src/app\(crm)\settings\integrations\page.tsx | 202 | <Button variant="danger" size="icon" onClick={() => handleDelete(providerDef.id as any)} title="Remove Integration"> |
| src/app\(crm)\tasks\[id]\TaskDocumentsWrapper.tsx | 19 | <DocumentList documents={documents as any} taskId={taskId} /> |
| src/app\(crm)\tasks\page.tsx | 176 |  |
| src/app\(crm)\tasks\page.tsx | 206 | // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload — typed Prisma/API result shape requires architectural schema work deferred to S3 |
| src/app\(crm)\tasks\workload\page.tsx | 91 | {metrics.map((m: any) => ( |
| src/app\(crm)\territories\TerritoriesClient.tsx | 182 | {territories?.map((territory: any) => ( |
| src/app\(crm)\tickets\[id]\page.tsx | 86 | {ticket.messages?.map((msg: any) => ( |
| src/app\(crm)\tickets\page.tsx | 70 | {tickets?.map((ticket: any) => ( |
| src/app\api\webhooks\resend\route.ts | 29 | }) as any; |
| src/app\api\webhooks\resend\route.ts | 79 | const updateData: any = { ...metadata, status: newStatus }; |
| src/components\auth\MockClerkProvider.tsx | 26 | } as any, |
| src/components\communication\CallDirectory.tsx | 14 | const [users, setUsers] = useState<any[]>(MOCK_USERS); // We would fetch tenant users here, but we can simulate a list for the UI skeleton |
| src/components\communication\CallDirectory.tsx | 15 | const [presences, setPresences] = useState<Record<string, any>>({}); |
| src/components\communication\CallDirectory.tsx | 27 | const pMap: Record<string, any> = {}; |
| src/components\communication\CallDirectory.tsx | 28 | res.data.forEach((p: any) => pMap[p.userId] = p); |
| src/components\communication\MailInterface.tsx | 8 | const [inbox, setInbox] = useState<any[]>([]); |
| src/components\communication\MailInterface.tsx | 9 | const [activeMail, setActiveMail] = useState<any \| null>(null); |
| src/components\crm\ActivityTimeline.tsx | 14 | {activities.map((activity: any) => ( |
| src/components\crm\CRMCommentSection.tsx | 299 | {comment.replies.map((reply: any) => { |
| src/components\crm\DealForm.tsx | 170 | {stages.map((s: any) => ( |
| src/components\crm\DealForm.tsx | 193 | {assignableUsers.map((user: any) => ( |
| src/components\crm\LeadTable.tsx | 77 | {leads.map((lead: any) => ( |
| src/components\crm\TaskBoard.tsx | 28 | {tasks.filter(t => t.status === status).map((task: any) => ( |
| src/components\reporting\CameraMetricsCard.tsx | 6 | export function CameraMetricsCard({ camera }: { camera: any }) { |
| src/components\reporting\CrmMetricsCard.tsx | 9 | export function CrmMetricsCard({ crm }: { crm: any }) { |
| src/components\reporting\SecurityMetricsCard.tsx | 9 | export function SecurityMetricsCard({ security }: { security: any }) { |
| src/hooks\useWebRTCCall.ts | 255 | throw new Error((typeof res.error === 'string' ? res.error : (res.error as any)?.message) \|\| 'Failed to initiate call'); |
| src/hooks\useWebRTCCall.ts | 284 | throw new Error((typeof res.error === 'string' ? res.error : (res.error as any)?.message) \|\| 'Failed to accept call'); |
| src/lib\providers\load-test-mock.provider.ts | 24 | async sendEmail(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 24 | async sendEmail(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 33 | async makeCall(to: any, from: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 33 | async makeCall(to: any, from: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 33 | async makeCall(to: any, from: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 34 | async getRecording(callId: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 34 | async getRecording(callId: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 35 | async endCall(sid: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 35 | async endCall(sid: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 36 | async fetchRecording(url: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 36 | async fetchRecording(url: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 37 | async sendSms(tenantId: string, payload: any): Promise<any> { return { success: true }; } |
| src/lib\providers\load-test-mock.provider.ts | 37 | async sendSms(tenantId: string, payload: any): Promise<any> { return { success: true }; } |
| src/lib\providers\load-test-mock.provider.ts | 39 | async initiateCall(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 39 | async initiateCall(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 50 | async receiveWebhook(payload: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 50 | async receiveWebhook(payload: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 51 | async verifyWebhook(signature: any, payload: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 51 | async verifyWebhook(signature: any, payload: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 51 | async verifyWebhook(signature: any, payload: any): Promise<any> { return {}; } |
| src/lib\providers\load-test-mock.provider.ts | 52 | async sendMessage(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 52 | async sendMessage(tenantId: string, payload: any): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 60 | async getStreamStatus(cameraId: string): Promise<any> { return { active: true }; } |
| src/lib\providers\load-test-mock.provider.ts | 61 | async getProviderHealth(): Promise<any> { return { healthy: true }; } |
| src/lib\providers\load-test-mock.provider.ts | 62 | async generateStreamToken(tenantId: string, cameraId: string): Promise<any> { |
| src/lib\providers\load-test-mock.provider.ts | 71 | async generateResponse(prompt: any): Promise<any> { return { success: true, text: 'mock' }; } |
| src/lib\providers\load-test-mock.provider.ts | 71 | async generateResponse(prompt: any): Promise<any> { return { success: true, text: 'mock' }; } |
| src/lib\providers\load-test-mock.provider.ts | 72 | async generateContent(tenantId: string, systemPrompt: string, userPrompt: string, tools?: AITool[]): Promise<any> { |
| src/lib\queue\functions\notification.worker.ts | 81 | } catch (err: any) { |
| src/lib\queue\functions\outbox.worker.ts | 32 | export async function outboxWorkerHandler({ event, step }: { event: { data: SecureJobEnvelope<any> }, step: any }) { |
| src/lib\queue\functions\outbox.worker.ts | 32 | export async function outboxWorkerHandler({ event, step }: { event: { data: SecureJobEnvelope<any> }, step: any }) { |
| src/lib\queue\functions\outbox.worker.ts | 46 | headers: { ...(event.data.payload as any).headers, 'Idempotency-Key': idempotencyKey } |
| src/lib\queue\functions\outbox.worker.ts | 102 | ...(event.data.payload as any), |
| src/lib\queue\functions\outbox.worker.ts | 146 | ...(event.data.payload as any), |
| src/lib\utils\date-range.ts | 18 | const raw: any = {}; |
| src/modules\cctv\stream.service.ts | 82 | } catch (e: any) { |
| src/modules\core\events\outbox.service.ts | 54 | correlationId: (event.payload as any)?._sys_correlationId \|\| event.id, |
| src/modules\recovery\scheduler\RPOMonitor.ts | 32 | const snapshotMap = new Map(latestSnapshots.map((s: any) => [s.tenantId, s])); |
| src/modules\recovery\scheduler\RetentionPolicyService.ts | 19 | const toDelete: any[] = []; |
| src/modules\recovery\scheduler\RetentionPolicyService.ts | 34 | const snapshotsByTenant = new Map<string, any[]>(); |


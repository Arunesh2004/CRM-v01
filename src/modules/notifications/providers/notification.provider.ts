export interface SendNotificationDTO {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  actionUrl?: string;
}

export interface NotificationProvider {
  send(payload: SendNotificationDTO): Promise<void>;
}

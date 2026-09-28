import { ChatService } from './src/modules/communication/chat.service'; 
ChatService.getConversations('e2e-tenant-a-0000-0000-000000000000', 'e2e-admin-a-0000-0000-000000000000').then(c => console.log(JSON.stringify(c, null, 2)));

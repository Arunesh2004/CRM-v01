import { ChatService } from './src/modules/communication/chat.service'; 
ChatService.getConversations('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001').then(c => console.log(JSON.stringify(c, null, 2)));

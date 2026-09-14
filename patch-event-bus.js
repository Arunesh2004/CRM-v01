const fs = require('fs');
let c = fs.readFileSync('src/modules/core/events/event-bus.ts', 'utf8');
c = c.replace(
  "import { registerNotificationHandlers } from './notification.handlers';\nregisterNotificationHandlers();", 
  '// Notification handlers removed; now handled durably via EventOutbox'
);
fs.writeFileSync('src/modules/core/events/event-bus.ts', c);

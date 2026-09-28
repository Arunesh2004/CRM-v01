# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\e2e\internal-chat.spec.ts >> Phase 15B: Internal Chat E2E (Dual-Browser) >> Admin sends message -> Employee receives realtime -> Employee replies
- Location: src\tests\e2e\internal-chat.spec.ts:4:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3008/communication/chat", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - region "Notifications alt+T"
    - complementary [ref=e3]:
      - generic [ref=e8]:
        - paragraph [ref=e9]: Tenant A E2ECRM
        - paragraph [ref=e10]: Security Suite
      - navigation [ref=e11]:
        - generic [ref=e12]:
          - paragraph [ref=e13]: Overview
          - link "Dashboard" [ref=e15] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e22]:
          - paragraph [ref=e23]: CRM
          - generic [ref=e24]:
            - link "Leads" [ref=e25] [cursor=pointer]:
              - /url: /leads
            - link "Customers" [ref=e31] [cursor=pointer]:
              - /url: /customers
            - link "Deals" [ref=e38] [cursor=pointer]:
              - /url: /deals
            - link "Quotes" [ref=e42] [cursor=pointer]:
              - /url: /quotes
            - link "Territories" [ref=e46] [cursor=pointer]:
              - /url: /territories
            - link "Locations" [ref=e51] [cursor=pointer]:
              - /url: /locations
        - generic [ref=e56]:
          - paragraph [ref=e57]: Workspace
          - generic [ref=e58]:
            - link "Tasks" [ref=e59] [cursor=pointer]:
              - /url: /tasks
            - link "Tickets" [ref=e64] [cursor=pointer]:
              - /url: /tickets
            - link "Chat" [ref=e68] [cursor=pointer]:
              - /url: /chat
            - link "Communications" [ref=e72] [cursor=pointer]:
              - /url: /communications
        - generic [ref=e76]:
          - paragraph [ref=e77]: Security Ops
          - generic [ref=e78]:
            - link "Cameras" [ref=e79] [cursor=pointer]:
              - /url: /cameras
            - link "Incidents" [ref=e84] [cursor=pointer]:
              - /url: /incidents
            - link "Monitoring" [ref=e88] [cursor=pointer]:
              - /url: /monitoring
        - generic [ref=e92]:
          - paragraph [ref=e93]: Insights
          - generic [ref=e94]:
            - link "Reports" [ref=e95] [cursor=pointer]:
              - /url: /reports
            - link "Analytics" [ref=e99] [cursor=pointer]:
              - /url: /analytics
            - link "AI Assistant" [ref=e103] [cursor=pointer]:
              - /url: /assistant
        - generic [ref=e108]:
          - paragraph [ref=e109]: System
          - generic [ref=e110]:
            - link "Approvals" [ref=e111] [cursor=pointer]:
              - /url: /admin/approvals
            - link "Settings" [ref=e115] [cursor=pointer]:
              - /url: /settings/employees
      - generic [ref=e121]:
        - generic [ref=e122]: U
        - generic [ref=e123]:
          - paragraph [ref=e124]: User
          - paragraph [ref=e125]: tenant admin
    - main [ref=e126]:
      - generic [ref=e127]:
        - heading "Chat" [level=1] [ref=e129]
        - button "Search... ⌘ K" [ref=e131]:
          - generic [ref=e135]: Search...
          - generic [ref=e136]:
            - generic [ref=e137]: ⌘
            - text: K
        - generic [ref=e138]:
          - button "Quick Add" [ref=e140]
          - button "AI Assistant" [ref=e142]
          - button [ref=e147]
          - generic [ref=e152] [cursor=pointer]:
            - generic [ref=e153]: U
            - generic [ref=e154]: User
      - generic [ref=e157]:
        - heading "Internal Chat" [level=1] [ref=e158]
        - generic [ref=e159]:
          - generic [ref=e160]:
            - generic [ref=e161]: Conversations
            - generic [ref=e169] [cursor=pointer]:
              - paragraph [ref=e170]: Test MEMBER
              - paragraph [ref=e171]: Tap to view
          - paragraph [ref=e174]: Select a conversation to start messaging.
    - button "Toggle AI Assistant" [ref=e175]
    - dialog "AI Assistant":
      - generic:
        - generic:
          - generic:
            - paragraph: Nexus AI
            - paragraph: Online
        - generic:
          - button "Expand"
          - button "Close"
      - generic:
        - generic:
          - generic:
            - paragraph: How can I help?
            - paragraph: Ask about leads, tasks, incidents, or anything in your CRM.
          - generic:
            - button "What are my tasks today?"
            - button "Which leads need follow-up?"
            - button "Show critical incidents"
      - generic:
        - generic:
          - textbox "Ask me anything…"
          - button "Send" [disabled]
  - generic [ref=e183] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e184]
    - generic [ref=e188]:
      - button "Open issues overlay" [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]: "0"
          - generic [ref=e192]: "1"
        - generic [ref=e193]: Issue
      - button "Collapse issues badge" [ref=e194]
  - alert [ref=e197]
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.fixture';
  2  | 
  3  | test.describe('Phase 15B: Internal Chat E2E (Dual-Browser)', () => {
  4  |   test('Admin sends message -> Employee receives realtime -> Employee replies', async ({ adminPage, empAPage }) => {
  5  |     // Both users navigate to Chat
  6  |     await adminPage.goto('/communication/chat');
> 7  |     await empAPage.goto('/communication/chat');
     |                    ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  8  |     
  9  |     // Wait for the UI to load
  10 |     await expect(adminPage.locator('h1', { hasText: 'Internal Chat' }).or(adminPage.locator('h1', { hasText: 'Inbox' }).or(adminPage.getByRole('heading'))).first()).toBeVisible({ timeout: 15000 });
  11 |     
  12 |     console.log('ADMIN PAGE HTML:', await adminPage.content());
  13 |     // Select the seeded conversation (Test MEMBER for Admin, Test TENANT_ADMIN for Emp A)
  14 |     await adminPage.locator('text=Test MEMBER').click();
  15 |     await empAPage.locator('text=Test TENANT_ADMIN').click();
  16 |     
  17 |     const messageInputAdmin = adminPage.locator('input[placeholder="Type a message..."], textarea[placeholder="Type a message..."]').first();
  18 |     
  19 |     const testMessage = `E2E Test from Admin - ${Date.now()}`;
  20 |     await messageInputAdmin.waitFor({ state: 'visible', timeout: 10000 });
  21 |     await messageInputAdmin.fill(testMessage);
  22 |     await messageInputAdmin.press('Enter');
  23 | 
  24 |     // Admin sees message in their own DOM
  25 |     await expect(adminPage.locator(`text=${testMessage}`).first()).toBeVisible();
  26 | 
  27 |     // Employee sees the message in their DOM (with or without refresh depending on realtime)
  28 |     if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
  29 |       await expect(empAPage.locator(`text=${testMessage}`).first()).toBeVisible({ timeout: 5000 });
  30 |     } else {
  31 |       await empAPage.reload();
  32 |       // Need to re-select conversation after reload
  33 |       await empAPage.locator('text=Test TENANT_ADMIN').click();
  34 |       await expect(empAPage.locator(`text=${testMessage}`).first()).toBeVisible({ timeout: 5000 });
  35 |     }
  36 | 
  37 |     // Employee replies
  38 |     const replyMessage = `E2E Reply from Employee - ${Date.now()}`;
  39 |     const messageInputEmp = empAPage.locator('input[placeholder="Type a message..."], textarea[placeholder="Type a message..."]').first();
  40 |     await messageInputEmp.fill(replyMessage);
  41 |     await messageInputEmp.press('Enter');
  42 | 
  43 |     // Employee sees their own reply
  44 |     await expect(empAPage.locator(`text=${replyMessage}`).first()).toBeVisible();
  45 | 
  46 |     // Admin sees the reply
  47 |     if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
  48 |       await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 5000 });
  49 |     } else {
  50 |       await adminPage.reload();
  51 |       await adminPage.locator('text=Test MEMBER').click();
  52 |       await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 5000 });
  53 |     }
  54 |     
  55 |     // Reload and verify persistence
  56 |     await adminPage.reload();
  57 |     await adminPage.locator('text=Test MEMBER').click();
  58 |     await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 10000 });
  59 |   });
  60 | });
  61 | 
```
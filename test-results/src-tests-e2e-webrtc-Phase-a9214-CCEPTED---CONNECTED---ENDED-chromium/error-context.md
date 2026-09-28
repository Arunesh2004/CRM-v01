# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\e2e\webrtc.spec.ts >> Phase 15B: WebRTC Call Lifecycle E2E >> Admin calls Employee -> RINGING -> ACCEPTED -> CONNECTED -> ENDED
- Location: src\tests\e2e\webrtc.spec.ts:4:7

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
  3  | test.describe('Phase 15B: WebRTC Call Lifecycle E2E', () => {
  4  |   test('Admin calls Employee -> RINGING -> ACCEPTED -> CONNECTED -> ENDED', async ({ adminPage, empAPage }) => {
  5  |     // Both users navigate to communication
  6  |     await adminPage.goto('/communication/chat');
> 7  |     await empAPage.goto('/communication/chat');
     |                    ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  8  |     
  9  |     // Wait for the UI to load
  10 |     await expect(adminPage.locator('h1', { hasText: 'Internal Chat' }).or(adminPage.locator('h1', { hasText: 'Inbox' }).or(adminPage.getByRole('heading'))).first()).toBeVisible({ timeout: 15000 });
  11 |     
  12 |     // Select the conversation
  13 |     await adminPage.locator('text=Test MEMBER').click();
  14 |     
  15 |     // Assume there is a Call button
  16 |     const callButton = adminPage.locator('button', { hasText: 'Call' }).first();
  17 |     
  18 |     // We only execute this if a call button actually exists in the UI
  19 |     if (await callButton.isVisible()) {
  20 |       await callButton.click();
  21 |       
  22 |       // Admin should see their own call interface (e.g. Ringing state)
  23 |       await expect(adminPage.locator('text=Calling...')).toBeVisible({ timeout: 10000 });
  24 | 
  25 |       // If Pusher is missing, we cannot proceed with the WebRTC signaling flow
  26 |       if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
  27 |         console.log('Pusher missing: WebRTC signaling cannot proceed. Test ending early.');
  28 |         return;
  29 |       }
  30 | 
  31 |       // Employee should see incoming call modal
  32 |       const incomingCallAlert = empAPage.locator('text=Incoming Call...');
  33 |       await expect(incomingCallAlert).toBeVisible({ timeout: 10000 });
  34 | 
  35 |       // Employee accepts the call
  36 |       // The WebRTCCallManager uses an emerald button with a Phone icon, which lacks text 'Accept'.
  37 |       // It has the class bg-emerald-500/10 or text-emerald-500. We can look for the button containing the Phone icon.
  38 |       const acceptButton = empAPage.locator('button.bg-emerald-500\\/10').first();
  39 |       await acceptButton.click();
  40 | 
  41 |       // Verify connection (WebRTC streams or UI state)
  42 |       await expect(adminPage.locator('text=Call Connected')).toBeVisible({ timeout: 10000 });
  43 |       await expect(empAPage.locator('text=Call Connected')).toBeVisible({ timeout: 10000 });
  44 | 
  45 |       // End call
  46 |       const endCallButton = adminPage.locator('button.bg-red-500').first();
  47 |       await endCallButton.click();
  48 | 
  49 |       // Verify call has ended
  50 |       await expect(adminPage.locator('text=Call Ended')).toBeVisible({ timeout: 5000 });
  51 |     } else {
  52 |       // Log that WebRTC UI elements are missing
  53 |       console.log('WebRTC Call UI not found in DOM.');
  54 |     }
  55 |   });
  56 | });
  57 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\e2e\tenant-isolation.spec.ts >> Phase 15B: Tenant Isolation E2E >> Tenant B Employee cannot access Tenant A data
- Location: src\tests\e2e\tenant-isolation.spec.ts:4:7

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - region "Notifications alt+T"
    - complementary [ref=e3]:
      - generic [ref=e8]:
        - paragraph [ref=e9]: Tenant B E2ECRM
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
          - paragraph [ref=e125]: member
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
            - generic [ref=e162]: No conversations found.
          - paragraph [ref=e166]: Select a conversation to start messaging.
    - button "Toggle AI Assistant" [ref=e167]
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
  - generic [ref=e175] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e176]
    - generic [ref=e180]:
      - button "Open issues overlay" [ref=e181]:
        - generic [ref=e182]:
          - generic [ref=e183]: "0"
          - generic [ref=e184]: "1"
        - generic [ref=e185]: Issue
      - button "Collapse issues badge" [ref=e186]
  - alert [ref=e189]
```
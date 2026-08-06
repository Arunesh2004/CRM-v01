# Client Presentation Script: AI-Security-CRM-SaaS

## Opening (1 Minute)
"Welcome. Today we will demonstrate how our unified SaaS platform manages security operations, customer relationships, communication, analytics, and automation entirely within a single pane of glass. We are running in a secure, multi-tenant demo mode."

## 1. Login & Identity (1 Minute)
**Action:** Log in as `admin@acmesecurity.com`.
**Script:** "We begin by authenticating via Clerk. Our backend strictly enforces tenant isolation for Acme Security Solutions. No user can ever access data belonging to another company on our platform."

## 2. Enterprise Dashboard & Analytics (2 Minutes)
**Action:** Navigate to the `/reports` dashboard.
**Script:** "Upon logging in, operators see the Analytics Dashboard. This aggregates data directly from our secure operational services. We can instantly see we have X open incidents, Y active cameras, and our customer conversion rate. This data is pulled from live Prisma counts."

## 3. CRM & Customer Management (2 Minutes)
**Action:** Navigate to `/customers`.
**Script:** "Let's look at our CRM. Here we manage our client portfolio (Stark Industries, Wayne Enterprises). Our system is unique because we link physical security operations directly to these customer accounts."

## 4. CCTV Monitoring & AI Detection (3 Minutes)
**Action:** Navigate to `/cameras`.
**Script:** "Here we see our deployed camera fleets. Notice the Front Gate is ONLINE. While currently using Mock Providers for the stream, the architecture is ready to ingest raw RTSP. 
*Point out an AI Event.* 
Our platform doesn't just record video; it processes frames through Vision AI models. When YOLO detects an unauthorized vehicle, it triggers an AI Event."

## 5. Incident Management (2 Minutes)
**Action:** Navigate to `/incidents`.
**Script:** "That AI Event automatically spawned this Critical Incident. Security operators don't need to stare at screens—the system brings the problem to them. Let's open the incident and change its status from INVESTIGATING to RESOLVED."

## 6. Communication & Alerts (2 Minutes)
**Action:** Navigate to `/communications`.
**Script:** "When that incident was created, our Notification trigger automatically fired. We dispatched an Email to the facility manager and an SMS to the guard on duty. The platform logs all interactions, so we always have a chain of custody."

## 7. Billing & Subscriptions (2 Minutes)
**Action:** Navigate to `/billing`.
**Script:** "Under the hood, all these API calls (SMS, AI, Video Storage) are metered. The Billing engine tracks our usage against our active subscription plan limits. If we exceed camera limits, the platform prompts us to upgrade seamlessly via Stripe."

## 8. AI Copilot (3 Minutes)
**Action:** Navigate to `/assistant`.
**Script:** "Finally, let's look at our AI Copilot. Operators can simply ask questions in natural language.
*Type: 'How many incidents do we have?'*
Notice how the AI responds with exact data. Our architecture is highly secure: the LLM never sees raw database schemas. It only executes predefined secure tools that strictly respect the authenticated tenant ID."

## Closing
"Thank you. This platform provides a complete end-to-end security operational workflow with robust billing and AI layers built natively."

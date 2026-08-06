# Security Rules

This document outlines the strict security rules that govern the AI Security CRM SaaS Platform.

## 1. Multi-Tenant Security & Isolation

- **PostgreSQL Row-Level Security (RLS)**: RLS is mandatory for all tenant-owned tables. The application must establish a database session and set a variable (e.g., `app.current_tenant`) before executing queries. This ensures that even if the application layer's authorization logic is flawed, the database engine will inherently deny access to other tenants' data.
- **Application Layer**: Prisma tenant middleware/extensions must automatically append tenant validation rules to all queries to provide a first line of defense.

## 2. File Storage Security

Applies to: **Call recordings**, **CCTV evidence**, and **Attachments**.

- **Private Storage Only**: No public URLs are permitted for any sensitive files. S3/R2 buckets must strictly block public access.
- **Encryption at Rest**: All storage buckets must have server-side encryption enabled (KMS or AES-256).
- **Access Flow**:
    1. User requests access to a file.
    2. Backend performs **Permission check** (Does the user have `READ` access on the relevant resource?).
    3. Backend performs **Tenant validation** (Does this file belong to the user's active `tenantId`?).
    4. Backend generates a short-lived **signed URL** (temporary access, expiring quickly, e.g., 5-15 minutes).
- **Audit Logging**: Every request to generate a signed URL for sensitive files must be logged in the `AuditLog`.

## 3. CCTV Evidence Security

Applies specifically to video/image evidence attached to Incidents.

- **Tamper-Evident Hashing**: Upon upload, the backend must calculate a **SHA-256 hash** of the video/image file. This hash is stored immutably in the database. 
- **Purpose**: To detect unauthorized modification and ensure chain-of-custody for potential legal proceedings. Any discrepancy between the file's current hash and the stored hash indicates tampering.
- **Access Requirements**: Critical evidence access requires:
    - Explicit Permission validation.
    - An immediate `AuditLog` entry.
    - **Optional re-authentication** (e.g., requesting the user's password or an MFA token before allowing them to delete or download evidence).

## 4. AI Security Rules

The Gemini AI integration poses unique data exposure risks and must be tightly controlled:

1. **Data Minimization**: Only send the exact information required for the AI to perform its task. Do not send entire customer profiles if the AI only needs to summarize a single incident.
2. **Input Sanitization**: Strip or mask unnecessary Personally Identifiable Information (PII) before sending data to the Gemini API.
3. **Prompt Injection Defense**: User-generated content (notes, emails, chat messages) must **always** be treated as raw data strings. They must never be interpolated in a way that allows them to be interpreted as instructions by the LLM. 
4. **AI Permissions**: The AI cannot directly access the database. All AI data retrieval and actions must go through strictly controlled backend functions that respect the active user's permissions and `tenantId`.
5. **Audit AI Actions**: Any mutation (e.g., "AI automatically closed this incident") must be logged in the `AuditLog` attributing the action to the AI system on behalf of the user.

## 5. API Rate Limiting

- **Tenant-Level Rate Limiting**: Global rate limits are insufficient because a single compromised or abusive tenant could trigger a platform-wide Denial of Service by exhausting the global limit. We implement tenant-level rate limiting using Redis/Upstash to ensure fair use and resource protection per company.

## 6. Secret Management

- **Tenant Integrations**: When tenants provide API keys or credentials for external services (e.g., WhatsApp, custom email providers), these must never be stored in plain text. They must be symmetrically encrypted in the database using a master application key, and decrypted strictly in memory at runtime.

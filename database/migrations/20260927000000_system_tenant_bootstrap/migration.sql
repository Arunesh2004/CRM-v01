-- Bootstrap reserved SYSTEM tenant for global security events and system actors
INSERT INTO "Tenant" (id, name, status, "createdAt", "updatedAt")
VALUES ('SYSTEM', 'System Internal', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

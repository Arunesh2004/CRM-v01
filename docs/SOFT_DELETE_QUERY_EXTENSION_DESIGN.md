# SOFT DELETE QUERY EXTENSION DESIGN

## Design Requirements
We must implement a Prisma Client Extension that automatically filters out soft-deleted records for all normal queries, while explicitly permitting Admin/Recovery services to bypass this filter.

## Architecture

### 1. The Global Extension
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const softDeleteModels = ['Tenant', 'User', 'Customer', 'Lead', 'Task', 'Location', 'Incident', 'Message', 'Conversation', 'Call', 'Recording', 'Transcript', 'AISummary'];
        
        if (softDeleteModels.includes(model as string)) {
          // Identify read operations
          if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(operation)) {
            // Check for administrative bypass flag
            if (args.where?.includeDeleted === true) {
              // Strip the custom flag before sending to Prisma
              delete args.where.includeDeleted;
              return query(args);
            }

            // Apply automatic soft delete filter
            args.where = { ...args.where, deletedAt: null };
            
            // If the query was findUnique and we modified the where clause,
            // Prisma requires we upgrade it to findFirst
            if (operation === 'findUnique') {
              return (prisma[model as string] as any).findFirst(args);
            }
          }
        }
        return query(args);
      }
    }
  }
});
```

### 2. Standard Usage (UI & Employees)
Any standard API call inherently filters soft-deleted data.
```typescript
// Natively appends `deletedAt: null`. Does not return deleted users.
const users = await prisma.user.findMany({ where: { tenantId } }); 
```

### 3. Administrative / Recovery Bypass
When executing the Recovery Pipeline, the administrator must fetch deleted records. The extension permits this via a custom `includeDeleted: true` flag.
```typescript
// Bypasses the filter, returning soft-deleted users.
const deletedUsers = await prisma.user.findMany({ 
  where: { tenantId, includeDeleted: true } 
});
```

## Conclusion
This extension natively protects the entire SaaS application from rendering "ghost" records while maintaining the necessary backdoor for the future Phase 6 Recovery Engine.

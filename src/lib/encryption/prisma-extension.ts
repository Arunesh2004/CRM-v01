import { Prisma } from '@prisma/client';
import { EncryptionService } from './index';
import { FieldSecurityService } from '../../modules/security/field-security/field-security.service';

/**
 * Creates a Prisma extension that automatically handles field-level encryption and masking.
 * @param user The current authenticated user (needed to evaluate read permissions).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
export function withEncryptionContext(user: any | null = null) {
  return Prisma.defineExtension({
    name: 'FieldEncryptionExtension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = user?.tenantId || null;
          
          // 1. ON CREATE / UPDATE: Encrypt sensitive fields
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
          if (['create', 'update', 'createMany', 'updateMany', 'upsert'].includes(operation)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            const anyArgs = args as any;
            if (anyArgs && anyArgs.data) {
              const dataObj = anyArgs.data;
              for (const field of Object.keys(dataObj)) {
                if (await FieldSecurityService.requiresEncryption(model, field, tenantId)) {
                  if (typeof dataObj[field] === 'string') {
                    dataObj[field] = EncryptionService.encrypt(dataObj[field]);
                  }
                }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
              }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
            if (operation === 'upsert' && (args as any).create && (args as any).update) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
              const createObj = (args as any).create;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
              const updateObj = (args as any).update;
              for (const field of Object.keys(createObj)) {
                if (await FieldSecurityService.requiresEncryption(model, field, tenantId) && typeof createObj[field] === 'string') {
                  createObj[field] = EncryptionService.encrypt(createObj[field]);
                }
              }
              for (const field of Object.keys(updateObj)) {
                if (await FieldSecurityService.requiresEncryption(model, field, tenantId) && typeof updateObj[field] === 'string') {
                  updateObj[field] = EncryptionService.encrypt(updateObj[field]);
                }
              }
            }
          }

          // Execute the actual database query
          const result = await query(args);

          // 2. ON READ: Decrypt and/or Mask
          if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany'].includes(operation)) {
            if (Array.isArray(result)) {
              for (const row of result) {
                await processReadData(model, row, user);
              }
            } else if (result) {
              await processReadData(model, result, user);
            }
          } else if (['create', 'update', 'upsert'].includes(operation) && result) {
            // Also decrypt/mask the returned object after mutation
            await processReadData(model, result, user);
          }

          return result;
        }
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  });
}

/**
 * Mutates the read database row in-place, decrypting and applying masks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
async function processReadData(modelName: string, data: any, user: any) {
  if (!data || typeof data !== 'object') return;
  const tenantId = user?.tenantId || null;

  for (const field of Object.keys(data)) {
    if (await FieldSecurityService.requiresEncryption(modelName, field, tenantId)) {
      let value = data[field];
      
      // Decrypt if encrypted
      if (typeof value === 'string' && EncryptionService.isEncrypted(value)) {
        value = EncryptionService.decrypt(value);
      }

      // Check access permission
      const canAccessRaw = await FieldSecurityService.canAccessRawField(user, modelName, field, tenantId);
      
      if (canAccessRaw) {
        data[field] = value;
      } else {
        data[field] = FieldSecurityService.maskField(value, field);
      }
    }
  }
}

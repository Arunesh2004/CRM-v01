# PHASE 6.6 ENCRYPTION LIFECYCLE REPORT

## Key Rotation and Lifecycle Management

### 1. Key Generation (Backup Initialization)
During a disaster recovery backup:
- A new Data Encryption Key (DEK) is generated via `kms:GenerateDataKey`.
- Because each `RecoverySnapshot` receives a uniquely generated DEK, the blast radius of a compromised DEK is limited to exactly ONE backup file.

### 2. Key Rotation
Cloud providers (AWS KMS) allow automatic yearly rotation of the backing Customer Master Key (CMK) associated with an Alias. 
- When AWS rotates the CMK, it creates a new cryptographic backing key.
- All new `generateDataKey` calls will automatically use the newly rotated CMK.
- The `kmsKeyId` stored in the database maps to the *specific* CMK version used at the time.

### 3. Decryption (Restore Pipeline)
During a restore:
- The system reads `encryptedDEK` and `kmsKeyId` from `RecoverySnapshot`.
- It invokes `kms:Decrypt` using the explicit `kmsKeyId`.
- Even if the Master Alias has been rotated, AWS KMS retains the old CMK backing versions indefinitely to permit decryption of legacy `encryptedDEK`s.

### 4. Key Revocation (Disable Key)
If a security breach is detected (e.g. an insider steals the PostgreSQL database and the S3 archive bucket):
- The Security Administrator can explicitly disable the specific `kmsKeyId` in the Cloud Provider Console.
- Any subsequent `kms:Decrypt` API call for that `kmsKeyId` will return an immediate `AccessDeniedException`.
- The stolen encrypted backups immediately become cryptographically shredded and irrecoverable.

## Resilience Validation
This lifecycle guarantees:
- **No tenant starvation**: Generating keys is fast and independent per snapshot.
- **Perfect Forward Secrecy**: Stolen future keys cannot decrypt past DEKs if the past DEKs were encrypted with rotated CMK material that has since been disabled or restricted.

# Codebase Deep Audit Report

## A. Application Structure
- Total TS/TSX files in src: 668

## Candidates for Simplification (Files > 500 lines)
- `\src\tests\security\r146-comment-security.test.ts` (605 lines)
- `\src\modules\ai\tools\ai.tools.ts` (599 lines)
- `\src\tests\security\cctv-stream-integration.test.ts` (597 lines)
- `\src\modules\crm\deal\deal.service.ts` (569 lines)

## V. Dependencies
- Dependencies: 45
- DevDependencies: 24

## Dead Code Candidates
- Identified 400 potentially unused exports via ts-prune.

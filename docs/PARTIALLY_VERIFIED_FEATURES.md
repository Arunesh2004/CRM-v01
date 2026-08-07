# Partially Verified Features

**Date**: 2026-08-06

These features have proven runtime execution of specific sub-components (e.g., database validation) but lack complete end-to-end execution evidence.

## 1. CCTV Camera Registration
* **Feature**: `createCamera`
* **Evidence**: Database throws `Error: Location not found` when `locationId` is intentionally omitted.
* **Why Partial**: This proves the Postgres relational constraint validation layer is active. However, the subsequent infrastructure logic (like RTSP feed connection loops) was not successfully triggered to completion.
* **Classification**: `⚠️ PARTIALLY VERIFIED`

# Partially Working Features

**Date**: 2026-08-06

## 1. CCTV Camera Registration
* **Feature**: `createCamera`
* **Evidence**: Database throws `Error: Location not found` when `locationId` is missing/invalid.
* **Why Partial**: The database schema and constraint validation works flawlessly. However, the subsequent infrastructure to ingest RTSP feeds for this camera does not exist.
* **Classification**: `⚠️ PARTIALLY VERIFIED`

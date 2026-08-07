# Not Verified Features

**Date**: 2026-08-06

This report lists features that may or may not exist, but lack the complete top-to-bottom runtime evidence required to classify them as either `VERIFIED`, `FAILED`, or `MISSING`.

## 1. CCTV Media Streaming
* **Unverified Workflow**: RTSP feed ingestion, ONVIF discovery, WebRTC broadcast, Video Playback.
* **Reason**: No runtime script or UI action successfully triggered an RTSP lifecycle. The AST did not surface obvious entry points, but the codebase was not fully dismantled to prove its total absence.
* **Exact Blocker**: Lack of targeted integration script for media pipelines.

## 2. Advanced Telephony
* **Unverified Workflow**: Call summaries, AI Transcripts, Call Transfers, Voicemail.
* **Reason**: No runtime script successfully triggered a call lifecycle. The base `createCall` function crashed due to a constraint bug, preventing downstream testing.

## 3. Webhooks (Communication & Billing)
* **Unverified Workflow**: Processing inbound SMS replies, Stripe payment success webhooks.
* **Reason**: Requires exposing `localhost` via Ngrok or similar tunneling to ingest actual provider payloads.
* **Exact Blocker**: Testing environment lacks inbound external networking.

## 4. UI Dashboard Workflows
* **Unverified Workflow**: Clicking, filtering, sorting, pagination, rendering of CRM tables.
* **Reason**: Headless testing cannot authenticate.
* **Exact Blocker**: Clerk Bot Protection.

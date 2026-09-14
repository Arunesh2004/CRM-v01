# Phase 11 Environment Baseline

This document records the baseline environment specifications used during the isolated engineering load tests for Phase 11.

## Hardware / Host Specs
- **Architecture**: x64
- **Platform**: win32
- **Logical Cores**: 12
- **Total Memory**: 16.83 GB
- **Free Memory (at start)**: ~1.66 GB

## Software Versions
- **Node.js**: v24.12.0
- **Prisma**: 6.19.3
- **PostgreSQL**: 15-alpine (via docker-compose.e2e.yml)

## Configuration Boundaries
- **Prisma Connection Pool**: Not explicitly configured in `.env`. Defaults to `(num_physical_cpus * 2) + 1`. For a 12-core machine, this is effectively `25` concurrent connections per process instance.
- **Inngest Concurrency**: Default settings unless explicitly modified during worker load tests.
- **Upstash Redis**: Isolated test instance limits.

## Important Note
A passing load test at N concurrency means **"verified at N in this environment,"** NOT **"the product supports N users in Production."**

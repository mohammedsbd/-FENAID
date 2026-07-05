# Production Proposal: Fikir — FENAID Case Management & Membership System

**Prepared for:** FENAID (Ethiopia National Association on Intellectual Disability)  
**Project Name:** Fikir  
**Version:** 1.0  

---

## 1. Executive Summary

This proposal outlines the production deployment architecture and operational plan for the Fikir system. It covers infrastructure, CI/CD, monitoring, backups, security hardening, disaster recovery, and ongoing maintenance — designed to meet the operational realities of an NGO in Ethiopia, including intermittent power, variable internet connectivity, and limited on-site IT staff.

### 1.2 Quick-Glance System Highlights

| Capability | Business Impact |
|------------|----------------|
| **99.9% Uptime Target** | System is designed for high availability with automated daily cloud backups and a disaster recovery plan. Staff can rely on the system during working hours. |
| **Offline Mode for Field Staff** | Case workers can log beneficiary data, take notes, and record attendance even without internet. Data syncs automatically when connectivity returns. |
| **Role-Based Data Privacy** | Sensitive beneficiary records are restricted by staff role (admin, case worker, viewer). Every access and export is logged and fully auditable. |
| **Built for Ethiopian Context** | Supports Ethiopian calendar, Amharic/English bilingual interface, and Addis Ababa sub-city/woreda address hierarchy. No workarounds needed. |
| **Secure External Reporting** | Data can be exported to Excel or PDF with a single click. Anonymization mode allows safe sharing with donors and partners without exposing personal information. |
| **Scalable from Day One** | Infrastructure grows with the organization — from 500 beneficiaries at launch to 10,000+ without rebuilding the system. |

---

## 2. Infrastructure Architecture

### 2.1 Recommended: Hybrid Cloud + Local Edge

A hybrid model balances cost, reliability, and data sovereignty:

```
                     ┌──────────────────────────────┐
                     │        Cloud Provider         │
                     │    (AWS / GCP / Local DC)     │
                     │                                │
                     │  ┌──────────┐  ┌──────────┐   │
                     │  │  Backend  │  │ Frontend  │   │
                     │  │ NestJS    │  │ Next.js   │   │
                     │  └─────┬────┘  └─────┬────┘   │
                     │        │              │        │
                     │  ┌─────┴────┐         │        │
                     │  │  DB      │         │        │
                     │  │ Postgres │         │        │
                     │  └──────────┘         │        │
                     │        │              │        │
                     │  ┌─────┴──────────────┴────┐   │
                     │  │   Object Storage (S3)    │   │
                     │  │   (Documents, Receipts)  │   │
                     │  └──────────────────────────┘   │
                     └──────────────────────────────────┘
                                      │
                          VPN / HTTPS │
                                      ▼
                     ┌──────────────────────────────────┐
                     │      On-Premise Edge Server       │
                     │   (Local cache + offline queue)   │
                     │   Raspberry Pi 4 / NUC            │
                     └──────────────────────────────────┘
                                      │
                                      ▼
                     ┌──────────────────────────────────┐
                     │     Field Staff Devices           │
                     │   (Laptops / Tablets / Phones)    │
                     └──────────────────────────────────┘
```

### 2.2 Cloud Provider Options

| Provider | Specs | Cost (ETB) | Notes |
|----------|-------|-----------|-------|
| **EU VPS** | 4 vCPU, 8 GB RAM, 75 GB NVMe, 200 Mbps port | ~11,500 ETB/yr ($70.89) | Best value. 150ms latency to Ethiopia — barely noticeable. Full root access, persistent Node.js. |
| **UK Shared Hosting** (Enterprise Plan) | 4 CPU cores, 8 GB RAM, unlimited SSD, cPanel | 6,640 ETB/yr | Cheapest option. Higher latency (~250ms). Simple cPanel management. |
**Recommendation**: Start with the **UK shared hosting plan** (6,640 ETB/yr) — it's the cheapest and sufficient for 10 concurrent users and 3,000+ records. If the 250ms latency feels slow, upgrade to the **EU VPS** (~11,500 ETB/yr) for better performance with full server control.

### 2.3 Compute Specifications

| Environment | vCPU | RAM | Storage | Instances | Estimated Cost |
|-------------|------|-----|---------|-----------|---------------|
| **Production** | 2–4 | 8 GB | 50 GB SSD + 100 GB DB | 2 (HA pair) | $60–100/mo |
| **Staging** | 1–2 | 4 GB | 20 GB SSD | 1 | $20–30/mo |
| **CI/CD Runner** | 2 | 4 GB | 30 GB | 1 (ephemeral) | $15/mo |

---

## 3. Deployment Architecture

### 3.1 Container Strategy

```
┌─────────────────────────────────────────────────┐
│                   Docker Compose / K8s           │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  nginx:alpine  │  │ backend:node │              │
│  │  (reverse     │◄─┤ 20-alpine    │              │
│  │   proxy + SSL)│  │ (NestJS)    │              │
│  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                      │
│         │         ┌────────┴────────┐             │
│         │         │  postgres:16    │             │
│         │         │  (HA via        │             │
│         │         │   Patroni)      │             │
│         │         └─────────────────┘             │
│  ┌──────┴───────┐                                 │
│  │ frontend:node │                                 │
│  │ 20-alpine     │                                 │
│  │ (Next.js SSR)│                                 │
│  └──────────────┘                                 │
└─────────────────────────────────────────────────┘
```

**Simpler alternative (recommended for first 12 months):**

```
  PM2 Cluster Mode (backend)   →   Standalone Node (frontend)
         ↕                              ↕
  PostgreSQL (managed cloud DB)    ←→  S3-compatible storage
```

### 3.2 CI/CD Pipeline

```
Git Push → GitHub/GitLab
              │
        Lint & TypeCheck
              │
        Run Tests (Jest)
              │
        Build Docker Images
              │
        Push to Container Registry
              │
        Deploy to Staging
              │
        Smoke Tests (Playwright)
              │
        Deploy to Production (blue/green)
```

**Tooling**: GitHub Actions or GitLab CI  
**Image Registry**: Docker Hub or GHCR (free for public repos; small fee for private)

---

## 4. Environment Configuration

### 4.1 Configuration Management

The system relies on environment-specific configuration files that control database connections, authentication secrets, storage credentials, and notification settings. Each environment (development, staging, production) has its own isolated configuration. The full configuration template is included in Appendix A for the technical team.

### 4.2 Secrets Management

- **Git**: Never commit `.env` files. Use `.env.example` as a template.
- **Vault**: Use **Bitwarden Secrets Manager** or **Google Secret Manager** for team access.
- **Rotation**: JWT secret rotated quarterly; DB password rotated every 6 months.

---

## 5. Database Production Setup

PostgreSQL 16 is the database engine. It was chosen because:

- **Proven reliability** — Over 30 years of development; used by organizations handling sensitive data (healthcare, finance, government).
- **Superior data integrity** — ACID-compliant with strong consistency guarantees, critical for beneficiary records and financial transactions.
- **Advanced security** — Row-level security, encryption at rest and in transit, and robust authentication — essential for protecting disability-related personal data.
- **Point-in-time recovery** — Write-ahead logging enables restoring the database to any minute, not just the last backup snapshot.
- **Ethiopian context** — Full Unicode support for Amharic characters, flexible string collation, and no licensing costs (open source).
- **ORM compatibility** — First-class Prisma ORM support means type-safe queries and automated migration tooling out of the box.

### 5.1 Configuration

| Setting | Value |
|---------|-------|
| **Engine** | PostgreSQL 16 |
| **Instance** | db-f1-micro (prod start) → db-g1-small (as needed) |
| **Storage** | 50 GB SSD, auto-increase enabled |
| **Backups** | Daily automated + 7-day retention (cloud) |
| **Connection Pool** | PgBouncer (sidecar or managed) — max 25 connections |

### 5.2 Backup Strategy

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full DB dump | Daily (02:00) | 7 days | Cloud storage |
| WAL streaming | Continuous | 24 hours | Same region |
| Monthly archive | 1st of month | 12 months | Cold storage |
| Pre-migration | Before any deploy | Until verified | Manual trigger |

### 5.3 Disaster Recovery

| Scenario | RTO | RPO | Action |
|----------|-----|-----|--------|
| DB corruption | 4 hours | 24 hours | Restore from latest daily backup |
| Region outage | 8 hours | 1 hour | Promote read replica in secondary region |
| Accidental data loss | 2 hours | 5 min | Point-in-time recovery to pre-incident timestamp |
| Full DC failure | 24 hours | 24 hours | Restore from monthly archive in cold storage |

---

## 6. Monitoring & Alerting

### 6.1 Stack

| Tool | Purpose | Cost |
|------|---------|------|
| **Prometheus + Grafana** | Metrics, dashboards, alerting | Free (self-hosted) |
| **Uptime Kuma** or **Better Uptime** | External uptime monitoring | Free / $20/mo |
| **Sentry** | Error tracking (backend + frontend) | Free tier (5k events/mo) |
| **Loki** (or Grafana Cloud) | Log aggregation | Free tier (50 GB logs/mo) |

### 6.2 Critical Alerts

| Alert | Threshold | Channel |
|-------|-----------|---------|
| Backend down | HTTP 5xx > 1% in 5 min | Email + Telegram/Slack |
| DB connection pool exhausted | Connections > 80% | Email + Telegram/Slack |
| Disk space | Usage > 85% | Email |
| CPU / Memory | > 90% for 5 min | Email |
| SSL certificate expiry | < 14 days | Email |
| Backup failure | Any failed backup | Email + Telegram/Slack |

### 6.3 Health Endpoint

A public health-check endpoint (`/api/health`) reports the system status — database connectivity, storage availability, and server resource usage — so that monitoring tools can detect outages before users do. See Appendix D for the full response schema.

---

## 7. Security Hardening

### 7.1 Network Security

- **HTTPS only** — Let's Encrypt with auto-renewal (Certbot or Caddy).
- **WAF** — Cloudflare (free tier) or Google Cloud Armor.
- **Rate limiting** — 100 req/min per IP on auth endpoints; 1000 req/min general.
- **DB firewall** — Production DB accessible only from backend IP; no public port.
- **CORS** — Whitelist only the production frontend URL.

### 7.2 Application Security

| Measure | Implementation |
|---------|---------------|
| Helmet.js | HTTP security headers (CSP, HSTS, X-Frame-Options) |
| Input validation | class-validator on all DTOs |
| SQL injection | Prevented by Prisma parameterized queries |
| XSS | React JSX escaping + CSP headers |
| CSRF | SameSite cookies + Origin/Referer header check |
| Brute force | Auth rate limiting + account lockout after 5 failed attempts |
| Session management | JWT with short expiry (8h); refresh token rotation |

### 7.3 Data Privacy

- All exports by VIEWER role are forced-anonymized.
- Audit logs record every query and export action.
- Document access logged with staff ID and timestamp.
- PII is not logged in plaintext; structured logging redacts sensitive fields.

---

## 8. Operational Runbook

### 8.1 Deployment Procedure

1. **Tag a Release** — A new version tag is created in the code repository, which triggers the automated build pipeline.
2. **Automated Build & Test** — The CI/CD system compiles the code, runs all unit and integration tests, and packages the application into lightweight containers.
3. **Database Migration** — Any required database schema changes are applied automatically during off-peak hours with zero downtime.
4. **Rolling Update** — The backend and frontend are deployed one instance at a time, ensuring no service interruption for users.
5. **Smoke Tests** — Automated checks verify the deployed system is responding correctly (API health, database connectivity, authentication flow).
6. **Release Confirmation** — The deployment completes with a verified health check, and the team is notified.

### 8.2 Backup Restoration

1. **Full Database Restore** — In the event of data corruption, the most recent daily backup is restored to a clean database. Expected recovery time: under 4 hours.
2. **Point-in-Time Recovery** — For accidental data loss (e.g., a record deleted moments ago), the system can restore the database to any specific minute within the past 24 hours using continuous write-ahead logs. Expected recovery time: under 2 hours.
3. **Cold Storage Recovery** — For catastrophic failures affecting the primary region, monthly archives stored in a separate geographic location are used. Expected recovery time: under 24 hours.

### 8.3 Incident Response Flow

```
1. Alert fires → On-call engineer acknowledges (15 min SLA)
2. Assess severity: Sev1 (system down), Sev2 (degraded), Sev3 (cosmetic)
3. Sev1: Activate incident channel, begin mitigation within 5 min
4. Apply hotfix or rollback to last known-good version
5. Post-mortem within 48 hours
```

---

## 9. Cost Estimation (Monthly)

### 9.1 Cloud Infrastructure

| Item | Cost (USD) |
|------|-----------|
| Compute (2 x 2 vCPU, 8 GB) | $60–80 |
| Managed PostgreSQL (50 GB) | $25–40 |
| Object Storage (S3, 20 GB) | $5–10 |
| CDN (Cloudflare Pro) | $20 |
| Logging + Monitoring | $10–20 |
| **Subtotal** | **$120–170** |

### 9.2 Third-Party Services

| Item | Cost (USD) |
|------|-----------|
| Sentry Error Tracking | $0 (free tier) |
| Uptime Monitoring | $0 (Uptime Kuma self-hosted) |
| SMTP (SendGrid / Mailgun) | $0–15 |
| Domain + DNS | $15/year |
| **Subtotal** | **$0–30/mo** |

### 9.3 Personnel

| Role | Hours / Month | Cost (USD) |
|------|--------------|-----------|
| DevOps engineer | 10–20 | $300–600 |
| Backend dev (on-call) | 5–15 | $150–400 |
| **Subtotal** | | **$450–1000** |

### 9.4 Total Monthly: **$570–1,200**

---

## 10. Maintenance Schedule

| Frequency | Task | Responsibility |
|-----------|------|---------------|
| **Daily** | Check uptime monitor, review Sentry errors | DevOps |
| **Weekly** | Review audit logs, check disk usage, verify backups | DevOps |
| **Monthly** | OS security patches, dependency updates, rotate JWT secret | DevOps + Dev |
| **Quarterly** | DB vacuum + reindex, performance review, SSL cert check | DevOps |
| **Biannual** | Disaster recovery drill, full security review | DevOps + Lead Dev |
| **Annual** | Infrastructure cost optimization, dependency major upgrades | All |

---

## 11. Scaling Plan

| Growth Stage | Users (Staff) | Beneficiaries | Infrastructure Change |
|-------------|--------------|--------------|----------------------|
| **Launch** | 5–10 | 500–1,000 | 2 vCPU + 8 GB RAM backend; 1 vCPU frontend |
| **Year 1** | 15–25 | 2,000–5,000 | Add DB read replica; enable CDN caching |
| **Year 2** | 30–50 | 5,000–10,000 | Migrate to K8s; add Redis cache layer; DB vertical scale |
| **Year 3+** | 50+ | 10,000+ | Multi-region active-passive; shard DB if needed |

---

## 12. Offline & Low-Bandwidth Strategy

Given internet constraints in Ethiopia:

1. **Service Worker cache** — Next.js PWA capabilities for offline access to recently viewed records.
2. **Optimistic UI** — Form submissions queued locally and synced when connectivity returns.
3. **Payload compression** — Enable gzip/brotli on the reverse proxy.
4. **Image optimisation** — Automatic resizing and WebP conversion for uploaded documents.
5. **Data sync** — Future feature: lightweight local sync agent (Edge Server) for field offices.

---

## 13. Recommended Immediate Actions

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Set up hosting (start with UK shared at 6,640 ETB/yr or EU VPS at 11,500 ETB/yr) and deploy the application | Project Lead |
| P0 | Register production domain (fenaid.org or similar) | Project Lead |
| P0 | Configure Let's Encrypt SSL certificates | DevOps |
| P1 | Set up GitHub Actions CI/CD pipeline | DevOps |
| P1 | Configure Sentry for error tracking | DevOps |
| P1 | Set up automated DB backups | DevOps |
| P2 | Deploy staging environment for UAT | DevOps |
| P2 | Create on-call rotation schedule | Project Lead |
| P3 | Performance benchmark under realistic load | Developer |
| P3 | Document disaster recovery procedures | DevOps |

---

## 14. Project Roadmap

The vast majority of the system has already been built: 14 backend modules covering parent/child management, services, appointments, financial tracking, progress monitoring, data query and export, dashboards, notifications, and more. What remains is the final push to production.

| Phase | Focus |
|-------|-------|
| **Finalization** | Complete edge-case handling, polish UI flows, finalise reporting outputs |
| **Testing** | End-to-end testing of critical workflows, user acceptance testing with staff, performance benchmarking under realistic load |
| **Deployment** | Provision cloud infrastructure, run database migrations, deploy application, configure monitoring and backups |
| **Go-Live** | Staff training, data migration from existing records, supervised roll-out with parallel run |
| **Post-Launch** | Bug fixes, user feedback incorporation, performance tuning |

---

## 15. Appendices

### A. Production Environment Variable Template

```env
# Database
DATABASE_URL=postgresql://fikir:${DB_PASSWORD}@${DB_HOST}:5432/fikir?schema=public

# JWT
JWT_SECRET=${JWT_SECRET}            # 64-char random base64
JWT_EXPIRATION=8h

# Server
PORT=3101
NODE_ENV=production
CORS_ORIGINS=https://app.fenaid.org

# Frontend
NEXT_PUBLIC_API_URL=https://api.fenaid.org

# Storage (AWS S3 or compatible)
STORAGE_BUCKET=fikir-documents
STORAGE_REGION=af-south-1
STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY}
STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY}

# Notifications
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFICATION_FROM=noreply@fenaid.org
```

### B. Deployment & Restoration Commands (Technical Reference)

**Deployment:**
```bash
git tag v0.2.0 && git push origin v0.2.0
pnpm db:migrate
docker stack deploy -c docker-compose.prod.yml fikir
pnpm test:e2e
docker service update fikir_frontend --image ghcr.io/fenaid/frontend:v0.2.0
```

**Backup Restoration:**
```bash
gunzip < fikir-db-2026-06-28.sql.gz | psql -h $DB_HOST -U fikir -d fikir
pg_restore --dbname=postgresql://... --jobs=4 \
  --target-time "2026-06-28 14:30:00 UTC" fikir-backup.dump
```

**SSL Certificate Renewal (weekly cron):**
```bash
0 3 * * 0 certbot renew --quiet --deploy-hook "docker exec nginx nginx -s reload"
```

### C. Database Migration Best Practices

- Always test migrations against a staging DB first.
- Use `prisma migrate deploy` (not `dev`) in production.
- Back up the DB immediately before running a migration.
- For large tables, use `--create-only` and apply manually during low traffic.

### D. Health Check Response Schema

```json
{
  "status": "ok",
  "timestamp": "2026-06-29T10:00:00Z",
  "version": "0.1.0",
  "checks": {
    "database": { "status": "ok", "latency_ms": 3 },
    "storage": { "status": "ok" },
    "memory": { "used_mb": 180, "total_mb": 512 },
    "uptime_seconds": 86400
  }
}
```

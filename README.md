# ☁️🛡️ CloudGuard — Cloud Security Posture Management

**CloudGuard** is a production-level MVP for a cloud security posture management (CSPM) platform. It automatically scans AWS environments for misconfigurations, vulnerabilities, and risky settings, then visualises the results on a real-time dashboard.

---

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   React UI   │───▶│  FastAPI API  │───▶│  PostgreSQL  │
│  (Vite/Nginx)│    │              │    └──────────────┘
└──────────────┘    │   Celery     │───▶┌──────────────┐
                    │   Workers    │    │    Redis      │
                    └──────┬───────┘    └──────────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         AWS API       Azure (stub)   GCP (stub)
```

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | Python 3.11, FastAPI, SQLAlchemy    |
| Task Queue     | Celery + Redis                      |
| Database       | PostgreSQL 16                       |
| Frontend       | React 18, Vite, Recharts            |
| Infrastructure | Docker, docker-compose              |
| Cloud SDK      | boto3 (AWS), Azure/GCP stubs        |

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your AWS credentials (optional for demo mode)
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

### 3. Access

| Service    | URL                         |
|------------|-----------------------------|
| Dashboard  | http://localhost:3000        |
| API Docs   | http://localhost:8000/docs   |
| Health     | http://localhost:8000/health |

> The dashboard shows **demo data** when the API is unavailable, so you can preview the UI immediately.

---

## AWS Connection Setup

### Option A: Environment variables

```bash
# .env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

### Option B: IAM Role (recommended for EC2/ECS)

Leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` blank — boto3 will automatically use the instance's IAM role.

### Required IAM Permissions

The scanner needs **read-only** access. Attach the following AWS managed policies:

- `ReadOnlyAccess`  (or create a custom policy with these services)
- Services used: IAM, EC2, S3, CloudTrail, GuardDuty, KMS, CloudWatch, RDS, STS

---

## Scanning Coverage

| Category       | Checks                                                        |
|----------------|---------------------------------------------------------------|
| **IAM**        | Wildcard permissions, admin policies, MFA, key age, escalation |
| **Network**    | SGs open to 0.0.0.0/0, SSH/RDP exposed, public instances      |
| **Storage**    | Public S3 buckets, encryption, bucket policies                 |
| **Compute**    | Public IPs, missing SGs, IMDSv2, outdated types               |
| **Logging**    | CloudTrail, GuardDuty, CloudWatch alarms                      |
| **Encryption** | EBS volumes, RDS, KMS key rotation                            |
| **Secrets**    | Access key age, unused keys, multiple active keys             |
| **Threats**    | Suspicious APIs, privilege escalation, brute force, odd IPs   |

---

## API Usage

### Trigger a scan

```bash
curl -X POST http://localhost:8000/api/scans
```

Response:
```json
{
  "scan_id": "a1b2c3d4-...",
  "status": "PENDING",
  "message": "Scan a1b2c3d4-... enqueued for AWS."
}
```

### Get dashboard stats

```bash
curl http://localhost:8000/api/dashboard
```

### Example scan results

```json
{
  "total_scans": 3,
  "latest_risk_score": 67.4,
  "total_findings": 24,
  "critical_count": 4,
  "high_count": 8,
  "medium_count": 7,
  "low_count": 5,
  "total_assets": 42,
  "recent_findings": [
    {
      "id": "f1a2b3...",
      "severity": "CRITICAL",
      "category": "IAM",
      "title": "MFA disabled for user admin@company.com",
      "description": "IAM user does not have MFA enabled.",
      "resource_arn": "arn:aws:iam::123456:user/admin",
      "recommendation": "Enable MFA for all IAM users."
    },
    {
      "id": "f4d5e6...",
      "severity": "CRITICAL",
      "category": "NETWORK",
      "title": "SG sg-0abc allows ALL traffic from 0.0.0.0/0",
      "description": "Security group allows unrestricted inbound traffic.",
      "resource_arn": "arn:aws:ec2:::security-group/sg-0abc",
      "recommendation": "Restrict inbound rules to required ports only."
    },
    {
      "id": "f7g8h9...",
      "severity": "HIGH",
      "category": "ENCRYPTION",
      "title": "RDS instance prod-db is not encrypted",
      "description": "Database storage is not encrypted.",
      "resource_arn": "arn:aws:rds:::db/prod-db",
      "recommendation": "Enable encryption for the RDS instance."
    }
  ]
}
```

---

## Project Structure

```
cloudguard/
├── backend/
│   ├── main.py                  # FastAPI entrypoint
│   ├── config.py                # Settings (env vars)
│   ├── database.py              # Async SQLAlchemy
│   ├── celery_app.py            # Celery configuration
│   ├── api/
│   │   └── routes.py            # REST endpoints
│   ├── models/
│   │   └── cloud_models.py      # Scan, Finding, CloudAsset, Alert
│   ├── scanners/
│   │   ├── iam_scanner.py       # IAM security checks
│   │   ├── network_scanner.py   # Network / SG checks
│   │   ├── storage_scanner.py   # S3 / storage checks
│   │   ├── compute_scanner.py   # EC2 / compute checks
│   │   ├── logging_scanner.py   # CloudTrail / GuardDuty
│   │   ├── encryption_scanner.py# EBS / RDS / KMS checks
│   │   └── secrets_scanner.py   # Access keys / credentials
│   ├── risk_engine/
│   │   ├── scorer.py            # 0–100 risk scoring
│   │   └── threat_detector.py   # CloudTrail threat analysis
│   ├── alerts/
│   │   ├── email_alert.py       # SMTP email alerts
│   │   └── telegram_alert.py    # Telegram bot alerts
│   ├── services/
│   │   ├── scan_service.py      # Scan orchestrator
│   │   └── tasks.py             # Celery background tasks
│   └── cloud_integrations/
│       ├── aws.py               # AWS boto3 client
│       ├── azure.py             # Azure stub
│       └── gcp.py               # GCP stub
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Dashboard UI
│       └── index.css            # Dark cybersecurity theme
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docker-compose.yml
├── .env.example
└── README.md
```

## Alerts Configuration

### Email (SMTP)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=app-password
ALERT_EMAIL_TO=security-team@company.com
```

### Telegram Bot
```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890
```

---

## License

MIT — Built as a production-level MVP for cybersecurity startups.

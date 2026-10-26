# CargoShare — Open-Source Spare-Capacity Logistics Marketplace

> The Uber-for-unused-freight space, built 100% on open-source technology.
> Traders book spare space in partially-filled containers/wagons/trucks/aircraft at up to 40% below charter rates. LSPs (logistics service providers) monetise deadhead capacity.

[![CI](https://github.com/cargoshare/cargoshare/actions/workflows/ci.yml/badge.svg)](https://github.com/cargoshare/cargoshare/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-orange.svg)](https://www.gnu.org/licenses/agpl-3.0)

## Tech Stack (all open-source)

| Layer | Technology | License |
|---|---|---|
| Web frontend | React 19 + Vite + Tailwind CSS v4 | MIT |
| Mobile frontend | React Native (Expo) — shares API client & state types | MIT |
| Backend API | Node.js + Express + Socket.io | MIT |
| Database | PostgreSQL 16 | PostgreSQL License |
| Cache + booking locks | Redis 7 (SETNX + TTL) | BSD-3 |
| Object storage | MinIO (S3-compatible) | AGPL-3.0 |
| Auth | Custom JWT + bcrypt + self-built OTP | self-built |
| Maps | Leaflet + OpenStreetMap | BSD-2 / ODbL |
| Real-time | Socket.io rooms (capacity + chat) | MIT |
| API docs | Swagger UI (OpenAPI 3 auto-generated) | MIT |
| Invoices | pdfkit (server-side PDF generation) | MIT |
| Admin panel | React-Admin over the same REST API | MIT |
| Monitoring | Prometheus + Grafana | Apache-2.0 |
| Reverse proxy / TLS | Nginx + Certbot (Let's Encrypt) | BSD-2 |
| Orchestration | Docker Compose (dev), Kubernetes manifests (prod) | Apache-2.0 |
| CI/CD | GitHub Actions | — |
| Payments | Razorpay sandbox (test mode) | proprietary SDK, open protocol |

## Quick start (local dev, ~5 minutes)

```bash
# 1. Clone & configure
git clone https://github.com/cargoshare/cargoshare.git && cd cargoshare
cp .env.example .env      # fill JWT_SECRET, Razorpay test keys, SMS key

# 2. Boot the whole stack (web, api, postgres, redis, minio, nginx, prometheus, grafana)
docker compose up --build

# 3. Open the apps
#    Web app        → http://localhost:8080
#    API            → http://localhost:4000/api/health
#    Swagger docs   → http://localhost:4000/api/docs
#    MinIO console  → http://localhost:9001  (cargoshare / cargoshare_dev_minio)
#    Grafana        → http://localhost:3001  (admin / cargoshare-admin)
```

Migrations in `server/sql/migrations/` are applied automatically on first boot (`./server/sql/migrations` is mounted into `docker-entrypoint-initdb.d`).
Seed data (001 + 002) creates demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@cargoshare.io | admin123 |
| Trader | ananya@sharmaexports.in | trader123 |
| LSP (approved) | karthik@deccanrail.in | lsp12345 |
| LSP (under review) | arun@southwindair.in | lsp12345 |

## Payment flow (Razorpay sandbox)

1. Trader clicks **Book Now** → backend acquires a **Redis lock** on the quantity (`SETNX lock:container:{id} EX 600`, atomic check-and-decrement via Lua).
2. Frontend opens Razorpay Checkout with a `rzp_test_…` key.
3. On success, client calls `POST /api/bookings/:id/confirm` → signature verified (HMAC-SHA256) → capacity committed in Postgres (`SELECT … FOR UPDATE`) → invoice PDF generated to MinIO.
4. Razorpay **webhook** (`POST /api/webhooks/razorpay`) is the server-side source of truth — the booking is finalized there even if the client closes the tab.
5. On payment failure or lock expiry (TTL 10 min), the quantity returns to the marketplace automatically.

Test card `4111 1111 1111 1111` or UPI `success@razorpay`.

## Repository layout

```
├── src/                    # Web frontend (React + Vite + Tailwind)
│   ├── pages/              # Landing, Search, Checkout, MyBookings, Chat, LSP & Admin consoles, OSS Hub
│   ├── components/         # Layout, MapView (Leaflet), shared UI kit
│   └── lib/                # store (context), api client, types, seed data
├── server/                 # Backend (Node.js + Express + Socket.io)
│   ├── src/routes/         # REST: auth, containers, bookings, admin, chat, reviews, notifications, webhooks
│   ├── src/services/       # otp.js, locks.js (Redis), invoice.js (pdfkit → MinIO)
│   ├── src/socket.js       # Socket.io rooms: marketplace / container:{id} / booking:{id} / user:{id}
│   └── sql/migrations/     # 001_init.sql (schema + commit_booking()), 002_seed.sql
├── mobile/                 # React Native app (Expo) — reuses src/lib types & API client
├── k8s/                    # Production manifests (namespace, deployments, services, ingress + TLS)
├── nginx/                  # Dev proxy, web.conf, prod.conf (Let's Encrypt)
├── monitoring/             # prometheus.yml + Grafana provisioning (dashboard included)
├── .github/workflows/ci.yml# Lint → test → build → push ghcr.io → rollout to K8s
└── docker-compose.yml      # One-command local stack
```

## Kubernetes (K3s/K8s) production

```bash
kubectl create namespace cargoshare
kubectl -n cargoshare create secret generic cargoshare-secrets \
  --from-literal=DATABASE_URL=postgres://… --from-literal=REDIS_URL=redis://… \
  --from-literal=JWT_SECRET=$(openssl rand -base64 48) \
  --from-literal=POSTGRES_PASSWORD=… --from-literal=MINIO_ACCESS_KEY=… --from-literal=MINIO_SECRET_KEY=… \
  --from-literal=RAZORPAY_KEY_ID=rzp_test_… --from-literal=RAZORPAY_KEY_SECRET=…
kubectl apply -f k8s/
# Point DNS at the ingress, then let cert-manager issue the Let's Encrypt cert (annotation included).
```

## Contributing

CargoShare is built in the open. PRs welcome — see `CONTRIBUTING.md`. By contributing you agree to license your work under AGPL-3.0.

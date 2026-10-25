# Deployment — Farm Fresh Hub → farmconnect.zchpc.ac.zw

This is the complete list of what the **VM must provide** for the backend and
the live site to talk to each other. The code side is finished and verified:
47 backend tests on PostgreSQL, 19 frontend tests, `tsc`/`eslint` clean, plus a
browser run of register → OTP → order → password change.

Paths assume the project lives at `/var/www/farm-fresh-hub`. Adjust to match.

---

## What the code already guarantees

| Concern | Where it is handled |
|---|---|
| No mixed-content requests | `resolveApiUrl()` in `frontend/src/lib/api-client.ts` converts an `http://` API value to same-origin `/api/v1` on an `https://` page |
| Correct host / redirects / CSRF behind the proxy | `ALLOWED_HOSTS`, `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS`, `SECURE_PROXY_SSL_HEADER` in `backend/backend/settings.py` (all env driven) |
| `DEBUG` off in production | `DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true','1','t')` → **defaults to False**; it only turns on if `.env` says so |
| PostgreSQL only | `DATABASES` reads `POSTGRES_*`; SQLite support was removed |
| Emails (welcome, order, status, password reset, OTP) | `backend/email_service.py` over `smtplib`, configured by `SMTP_*` |

Do **not** re-introduce a hardcoded API host or turn `DEBUG` on in `.env`.

---

## 1. Upload the code and the built frontend

```bash
# on the VM
git clone https://github.com/finesser1408/Farm-Connect.git /var/www/farm-fresh-hub
cd /var/www/farm-fresh-hub
```

The React build is the directory the vhost serves. Either build it on the VM:

```bash
cd frontend
npm ci
VITE_API_URL=/api/v1 npm run build      # produces frontend/dist
```

or upload a pre-built `dist/`. **`VITE_API_URL=/api/v1` matters** — it keeps
every API call on the page's own origin, so nginx can proxy it. (Even if
`.env.production` still holds an `http://…` value, the client falls back to
`/api/v1` automatically — the setting just makes it explicit.)

> Re-upload whenever the frontend changes: the hashed filename in
> `dist/index.html` (currently `index-*.js`) must change, otherwise the browser
> keeps serving the old bundle from cache.

## 2. Python environment

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip libpq-dev build-essential \
                    libjpeg-dev zlib1g-dev

cd /var/www/farm-fresh-hub/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

The `libjpeg`/`zlib` packages are only needed if pip has no prebuilt Pillow
wheel for the server's Python version.

## 3. `.env` — the single most important file

```bash
cd /var/www/farm-fresh-hub/backend
cp .env.example .env
chmod 600 .env
$EDITOR .env
```

Fill in every value. Non-obvious ones:

- **`DEBUG=False`** — required. Leaving it `True` exposes tracebacks and
  settings to the public.
- **`SECRET_KEY`** — generate a fresh one:
  `python3 -c "from django.core.management.utils import get_random_secret_key as g; print(g())"`
- **`SMTP_*`** — the Gmail mailbox + App Password (the same working credentials
  previously used by the NeighbourShare project). `DEFAULT_FROM_EMAIL` must be
  `Farm Fresh Hub <that mailbox>` or another mailbox you control.
- **`POSTGRES_*`** — the database you create in step 4; `POSTGRES_PORT=5432`
  on a normal VM install.
- **`FRONTEND_URL=https://farmconnect.zchpc.ac.zw`** — used to build the
  password-reset links inside emails.

settings.py loads `.env` itself through python-dotenv, so systemd needs no
environment file.

## 4. PostgreSQL

```sql
CREATE ROLE farmconnect_user LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE farmconnect OWNER farmconnect_user;
```

Then create the admin login Django uses for itself:

```bash
cd /var/www/farm-fresh-hub/backend
.venv/bin/python manage.py createsuperuser   # optional but recommended
```

## 5. Migrate, collect static, prepare media

```bash
cd /var/www/farm-fresh-hub/backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py collectstatic --noinput
mkdir -p media
```

- `migrate` creates every table (users, products, orders, carts, OTP codes).
- `collectstatic` fills `backend/staticfiles/`, which nginx serves for
  **`/static/`** — without it the Django admin has no CSS and looks broken.
- `media/` receives farmer product uploads; nginx serves **`/media/`**.

## 6. Run the API behind systemd

```bash
sudo cp deploy/farmconnect-backend.service /etc/systemd/system/
sudo $EDITOR /etc/systemd/system/farmconnect-backend.service   # set User + paths
sudo systemctl daemon-reload
sudo systemctl enable --now farmconnect-backend
systemctl status farmconnect-backend        # should say active (running)
```

gunicorn binds `127.0.0.1:8000` only — it is never reachable from the
internet; nginx is the front door.

## 7. nginx — connect the site to the API

CloudPanel → **Sites → your site → Vhost**, then paste the blocks from
[`deploy/nginx-locations.conf`](deploy/nginx-locations.conf) inside the
existing `server { ... }`, fixing the two paths if you uploaded elsewhere:

- `root` → `/var/www/farm-fresh-hub/frontend/dist`
- the `alias` lines → `backend/staticfiles/` and `backend/media/`

What each block does:

| Block | Why it is required |
|---|---|
| `location /api/` → `127.0.0.1:8000` | the browser's API calls (this is the missing link today) |
| `location /admin/` → `127.0.0.1:8000` | Django admin |
| `try_files … /index.html` | deep links: `/login`, `/checkout`, `/verify-email`, and every password-reset link in email |
| `/static/`, `/media/` | admin assets and product images |
| `client_max_body_size 20m` | product image uploads (nginx's 1 MB default returns 413) |

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

The vhost lives at `/etc/nginx/sites-enabled/<domain>.conf` and CloudPanel
validates it, but it can be regenerated when site settings change — keep a copy
of the edited version and re-check it after touching the site in CloudPanel.

## 8. Firewall / cloud security group

Open **80** and **443** (`sudo ufw allow 'Nginx Full'`, plus your provider's
security group). Port **8000** must stay closed — gunicorn is loopback only.

---

## Verification checklist (run on the VM)

```bash
D=https://farmconnect.zchpc.ac.zw

# SPA fallback — expect 200 text/html (currently 404 on the live site)
curl -I $D/login
curl -I $D/verify-email
curl -I $D/checkout

# API through the proxy — expect 200 application/json (currently 404)
curl -i $D/api/v1/products/ | head -1

# Registration round trip
curl -i -X POST $D/api/v1/auth/register/ -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","username":"smoke@example.com",\
"password":"SmokeTest123!","password_confirm":"SmokeTest123!",\
"user_type":"customer","first_name":"Smoke","last_name":"Test"}' | head -1

# Static + media (after collectstatic / an upload)
curl -o /dev/null -w '%{http_code}\n' $D/admin/
curl -o /dev/null -w '%{http_code}\n' $D/static/admin/css/base.css
```

Then in a browser, hard-refresh (`Ctrl+Shift+R`):

1. Register a customer — you should be taken to the dashboard, not an error.
2. `/verify-email` — **Send code**, and confirm the email arrives (SMTP).
3. Add a product to the cart → checkout → **Place Order** (no payment step).
4. Open an order — status shows `Pending`.
5. Account → change password, then sign in with the new one.
6. `Ctrl+Shift+R` again — the browser must request the **new** `index-*.js`.

---

## Live site status at the time of writing

Probed `https://farmconnect.zchpc.ac.zw`:

| URL | Result |
|---|---|
| `/` | 200, serving the **old** bundle `index-DCU12XU2.js` |
| `/api/v1/products/` | **nginx 404** — no `/api/` location exists yet |
| `/login`, `/verify-email` | **nginx 404** — no `try_files` fallback yet |

So exactly two things stand between the current state and a working system:
**step 7** (nginx) and **step 1** (upload the new `dist/`). Everything else is
already correct in the code.

## Not covered here

- Nothing on the VM has been touched from this workspace — these steps must be
  run there.
- The repository contains an unused `payments` app; no payment is ever taken,
  by design (orders are placed, not paid for).

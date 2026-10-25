"""gunicorn configuration for the Farm Fresh Hub API.

Run it from the backend/ directory (the one containing manage.py):

    gunicorn -c gunicorn.conf.py backend.wsgi
"""
import os

# Django is only ever reachable through nginx. CloudPanel's reverse proxy and
# the vhost in deploy/nginx-locations.conf both target this address.
bind = "127.0.0.1:8000"

# I/O bound on PostgreSQL: roughly one worker per vCPU is plenty here. The
# class is imported through backend.wsgi, which loads Django settings (and
# therefore .env) at startup.
workers = int(os.environ.get("GUNICORN_WORKERS", "3"))
worker_class = "sync"
timeout = 60
graceful_timeout = 30

# Log to stdout/stderr so journald picks them up via systemd.
accesslog = "-"
errorlog = "-"

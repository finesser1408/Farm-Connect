FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOME=/home/app

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system app \
    && useradd --system --gid app --create-home --home-dir /home/app app \
    && mkdir -p /app/media \
    && chown -R app:app /app

COPY --chown=app:app . .

EXPOSE 8000

USER app

CMD ["uvicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
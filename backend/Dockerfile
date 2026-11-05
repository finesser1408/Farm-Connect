# Use python 3.12
FROM python:3.12-slim

#prevent python from writing .pyc files to disc
ENV PYTHONDONTWRITEBYTECODE=1

# Display python output immediately in the console
ENV PYTHONUNBUFFERED=1
ENV HOME=/home/django

# Set the working directory to /app
WORKDIR /app

#install system depencies

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Copy depency list first 
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create the non-root user and writable application directories
RUN addgroup --system django && \
    adduser --system --ingroup django --home /home/django django && \
    mkdir -p /app/media && \
    chown -R django:django /app /home/django

# Copy Django application with ownership for the runtime user
COPY --chown=django:django . .

# Run the application as the non-root user
USER django

# Django and Gunicorn port that it will listen

EXPOSE 8000

# Start the application using Gunicorn
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]

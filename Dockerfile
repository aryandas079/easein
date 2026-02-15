# Use Python 3.11 to avoid deprecation warnings and ensure long-term support
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if any are needed for Pillow or others, usually none for basic usage)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest of the application
COPY backend /app/backend
COPY frontend /app/frontend

# Expose the port the app runs on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/app.py

# Run the application
CMD ["python", "backend/app.py"]

# Chromium and its system libraries come preinstalled; the tag must match the playwright pin in requirements.txt
FROM mcr.microsoft.com/playwright/python:v1.59.0-noble

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render (and most hosts) pass the port to listen on in $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

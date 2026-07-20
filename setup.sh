#!/bin/bash
# PropTrack Autosetup Script

echo "--- Starting PropTrack Autosetup ---"

# 1. Check for docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose not found. Please install it."
    exit 1
fi

# 2. Setup .env
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit the generated .env file with your production credentials."
else
    echo "Using existing .env file."
fi

# 3. Start Infrastructure
echo "Starting Docker containers..."
docker-compose up -d

# 4. Wait for Database
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U postgres; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

# 5. Run Migrations
echo "Running database migrations..."
docker-compose exec backend npx prisma db push

echo "--- Setup Complete! ---"
echo "Backend running at: http://localhost:3000"
echo "Frontend running at: http://localhost:5173"

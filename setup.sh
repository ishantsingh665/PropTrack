#!/bin/bash
# PropTrack Production Setup Script

echo "--- Starting PropTrack Production Setup ---"

# 1. Check for docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose not found. Please install it."
    exit 1
fi

# 2. Setup .env
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate a random JWT_SECRET if openssl is available
    if command -v openssl &> /dev/null; then
        RANDOM_SECRET=$(openssl rand -base64 32)
        sed -i "s/generate_a_strong_random_string_here/$RANDOM_SECRET/" .env
        echo "Generated a random JWT_SECRET for you."
    fi

    echo "--- Geocoding Configuration ---"
    echo "Nominatim can be heavy (50GB+ for large regions)."
    read -p "Do you want to enable the local geocoding service? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Do you want to use a specific country extract (e.g., Luxembourg)? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter Geofabrik PBF URL (default is Luxembourg): " PBF_URL
            if [ ! -z "$PBF_URL" ]; then
                sed -i "s|https://download.geofabrik.de/europe/luxembourg-latest.osm.pbf|$PBF_URL|" .env
                echo "Updated PBF_URL to $PBF_URL"
            fi
        fi
    else
        # Disable geocoding in .env
        sed -i 's/^NOMINATIM_URL=/# NOMINATIM_URL=/' .env
        echo "Geocoding service disabled in .env"
    fi
    
    echo "IMPORTANT: Please edit the .env file and set your production passwords and DOMAIN_URL."
    echo "Once you have updated .env, run this script again."
    exit 0
else
    echo "Using existing .env file."
fi

# 3. Build and Start
echo "Building and starting Docker containers..."
docker-compose up -d --build

# 4. Wait for Database
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U $(grep POSTGRES_USER .env | cut -d '=' -f2); do
  echo "Database is unavailable - sleeping"
  sleep 2
done

# 5. Run Migrations
echo "Running database migrations..."
docker-compose exec backend npx prisma db push

# 6. Seed (Optional)
read -p "Do you want to seed the database with initial property types? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose exec backend npm run prisma db seed
fi

echo "--- Setup Complete! ---"
echo "Your application should be available at: $(grep DOMAIN_URL .env | cut -d '=' -f2)"

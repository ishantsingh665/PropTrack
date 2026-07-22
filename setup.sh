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
    echo "By default, PropTrack uses the Public OpenStreetMap API (nominatim.openstreetmap.org)."
    read -p "Do you want to use the Public API? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Local Nominatim setup selected."
        echo "Note: Local Nominatim can be heavy (50GB+ for large regions)."
        read -p "Do you want to enable the local geocoding service? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sed -i "s|https://nominatim.openstreetmap.org|http://nominatim:8080|" .env
            read -p "Enter Geofabrik PBF URL (default is Luxembourg): " PBF_URL
            if [ ! -z "$PBF_URL" ]; then
                sed -i "s|https://download.geofabrik.de/europe/luxembourg-latest.osm.pbf|$PBF_URL|" .env
                echo "Updated PBF_URL to $PBF_URL"
            fi
        else
            # Disable geocoding in .env
            sed -i 's/^NOMINATIM_URL=/# NOMINATIM_URL=/' .env
            echo "Geocoding service disabled in .env"
        fi
    else
        echo "Using Public OpenStreetMap API."
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

# 4. Run Migrations
echo "Running database migrations..."
# Give the backend a few seconds to start up
sleep 5
docker-compose exec backend npx prisma db push

# 5. Seed (Optional)
read -p "Do you want to seed the database with initial property types? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose exec backend npx prisma db seed
fi

echo "--- Setup Complete! ---"
echo "Your application should be available at: $(grep DOMAIN_URL .env | cut -d '=' -f2)"

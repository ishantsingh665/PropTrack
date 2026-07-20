#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@proptrack.local"
PASSWORD="password123"

# 1. Login as Admin
echo "Logging in as Admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$PASSWORD\"}")
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -oP '(?<="token":")[^"]+')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to login. Is the server running?"
  exit 1
fi

# 2. Get Property Type ID
TYPE_ID=$(curl -s -X GET "$API_URL/property-types" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].children[0].id')

# 3. Create a Property (Automatic Geocoding Queue)
echo "Creating property for geocoding test..."
PROP_RES=$(curl -s -X POST "$API_URL/properties" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{
  \"propertyTypeId\": \"$TYPE_ID\",
  \"propertyLevel\": \"building\",
  \"name\": \"Geocode Test Building\",
  \"addressLine1\": \"Main St 100\",
  \"city\": \"Berlin\",
  \"countryCode\": \"DE\"
}")
PROP_ID=$(echo $PROP_RES | jq -r '.id')
GEO_STATUS=$(echo $PROP_RES | jq -r '.geocodeStatus')

echo "Property created. ID: $PROP_ID, Status: $GEO_STATUS"

if [ "$GEO_STATUS" == "pending" ]; then
  echo "✅ Geocode status is pending as expected."
else
  echo "❌ Expected geocode status to be 'pending', got '$GEO_STATUS'"
fi

# 4. Create a Property with Manual Coordinates
echo "Creating property with manual coordinates..."
MANUAL_RES=$(curl -s -X POST "$API_URL/properties" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{
  \"propertyTypeId\": \"$TYPE_ID\",
  \"propertyLevel\": \"building\",
  \"name\": \"Manual Coord Building\",
  \"addressLine1\": \"Manual St 200\",
  \"city\": \"Berlin\",
  \"countryCode\": \"DE\",
  \"latitude\": 52.52,
  \"longitude\": 13.405
}")
MANUAL_ID=$(echo $MANUAL_RES | jq -r '.id')
MANUAL_STATUS=$(echo $MANUAL_RES | jq -r '.geocodeStatus')
LAT=$(echo $MANUAL_RES | jq -r '.latitude')

echo "Manual Property created. ID: $MANUAL_ID, Status: $MANUAL_STATUS, Lat: $LAT"

if [ "$MANUAL_STATUS" == "manual_override" ] && [ "$LAT" == "52.52" ]; then
  echo "✅ Manual override worked as expected."
else
  echo "❌ Manual override failed. Status: $MANUAL_STATUS, Lat: $LAT"
fi

# 5. Update Address (Should re-queue)
echo "Updating address of first property..."
UPDATE_RES=$(curl -s -X PUT "$API_URL/properties/$PROP_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{
  \"propertyTypeId\": \"$TYPE_ID\",
  \"propertyLevel\": \"building\",
  \"name\": \"Geocode Test Building Updated\",
  \"addressLine1\": \"New St 500\",
  \"city\": \"Hamburg\",
  \"countryCode\": \"DE\"
}")
NEW_STATUS=$(echo $UPDATE_RES | jq -r '.geocodeStatus')

echo "Updated Property. New Status: $NEW_STATUS"

if [ "$NEW_STATUS" == "pending" ]; then
  echo "✅ Geocode status reset to pending after address change."
else
  echo "❌ Geocode status NOT reset. Got: $NEW_STATUS"
fi

echo "Validation complete."

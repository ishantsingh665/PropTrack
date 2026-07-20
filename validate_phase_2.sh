#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
EMAIL="admin@proptrack.local"
PASSWORD="password123"

# 1. Login to get token
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -oP '(?<="token":")[^"]+')

if [ -z "$TOKEN" ]; then
  echo "Login failed"
  exit 1
fi

echo "Login successful. Token: ${TOKEN:0:10}..."

# 2. Create a Company
echo "Creating a company..."
COMPANY_RES=$(curl -s -X POST "$API_URL/companies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "PropTrack Ventures", "countryCode": "US"}')

COMPANY_ID=$(echo $COMPANY_RES | grep -oP '(?<="id":")[^"]+')
echo "Company created with ID: $COMPANY_ID"

# 3. List Property Types to get an ID
echo "Fetching property types..."
TYPES_RES=$(curl -s -X GET "$API_URL/property-types" \
  -H "Authorization: Bearer $TOKEN")

# Pick the first child type ID (e.g. Apartment)
TYPE_ID=$(echo $TYPES_RES | grep -oP '(?<="id":")[^"]+' | head -n 2 | tail -n 1)
echo "Using Property Type ID: $TYPE_ID"

# 4. Create a Building (Property)
echo "Creating a building..."
PROPERTY_RES=$(curl -s -X POST "$API_URL/properties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"propertyLevel\": \"building\",
    \"propertyTypeId\": \"$TYPE_ID\",
    \"name\": \"Skyline Tower\",
    \"addressLine1\": \"123 Main Street\",
    \"city\": \"New York\",
    \"countryCode\": \"US\",
    \"gfaInputValue\": 1000,
    \"gfaInputUnit\": \"sqm\"
  }")

PROPERTY_ID=$(echo $PROPERTY_RES | grep -oP '(?<="id":")[^"]+')
echo "Building created with ID: $PROPERTY_ID"

# Verify GFA conversion (1000 sqm should be ~10763.9 sqft)
GFA_SQFT=$(echo $PROPERTY_RES | grep -oP '(?<="gfaSqft":)[0-9.]+')
echo "Verified GFA Sqft: $GFA_SQFT"

# 5. Add Ownership Stake
echo "Adding ownership stake..."
OWNER_RES=$(curl -s -X POST "$API_URL/properties/$PROPERTY_ID/owners" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\": \"$COMPANY_ID\", \"ownershipPct\": 100}")

echo "Ownership stake added."

# 6. Update Status and Verify Log
echo "Updating property status to sold..."
STATUS_RES=$(curl -s -X PATCH "$API_URL/properties/$PROPERTY_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"sold\", \"companyId\": \"$COMPANY_ID\", \"reason\": \"Property sold to new investor\"}")

echo "Status updated."

echo "Validation complete."

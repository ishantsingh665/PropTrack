#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
EMAIL="admin@proptrack.local"
PASSWORD="password123"

# 1. Login
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RES | grep -oP '(?<="token":")[^"]+')

# 2. Get a property type
TYPES_RES=$(curl -s -X GET "$API_URL/property-types" -H "Authorization: Bearer $TOKEN")
TYPE_ID=$(echo $TYPES_RES | grep -oP '(?<="id":")[^"]+' | head -n 2 | tail -n 1)

# 3. Create two duplicate properties
echo "Creating Duplicate Property A..."
PROP_A_RES=$(curl -s -X POST "$API_URL/properties" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{
    \"propertyLevel\": \"building\",
    \"propertyTypeId\": \"$TYPE_ID\",
    \"name\": \"Duplicate Building A\",
    \"addressLine1\": \"456 Duplicate St\",
    \"city\": \"Old Town\",
    \"countryCode\": \"SE\"
  }")
PROP_A_ID=$(echo $PROP_A_RES | grep -oP '(?<="id":")[^"]+')

echo "Creating Duplicate Property B..."
PROP_B_RES=$(curl -s -X POST "$API_URL/properties" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{
    \"propertyLevel\": \"building\",
    \"propertyTypeId\": \"$TYPE_ID\",
    \"name\": \"Duplicate Building B\",
    \"addressLine1\": \"456 Duplicate St\",
    \"city\": \"Old Town\",
    \"countryCode\": \"SE\"
  }")
PROP_B_ID=$(echo $PROP_B_RES | grep -oP '(?<="id":")[^"]+')

# 4. Create two companies and add stakes
echo "Creating Company 1 and 2..."
COMP1_RES=$(curl -s -X POST "$API_URL/companies" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name": "Owner One", "countryCode": "SE"}')
COMP1_ID=$(echo $COMP1_RES | grep -oP '(?<="id":")[^"]+')
COMP2_RES=$(curl -s -X POST "$API_URL/companies" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name": "Owner Two", "countryCode": "SE"}')
COMP2_ID=$(echo $COMP2_RES | grep -oP '(?<="id":")[^"]+')

curl -s -X POST "$API_URL/properties/$PROP_A_ID/owners" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"companyId\": \"$COMP1_ID\", \"ownershipPct\": 100}" > /dev/null
curl -s -X POST "$API_URL/properties/$PROP_B_ID/owners" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"companyId\": \"$COMP2_ID\", \"ownershipPct\": 100}" > /dev/null

# 5. Trigger Scan
echo "Triggering Duplicate Scan..."
SCAN_RES=$(curl -s -X POST "$API_URL/duplicates/scan" -H "Authorization: Bearer $TOKEN")
echo "Scan result: $SCAN_RES"

# 6. Fetch Pairs
echo "Fetching Duplicate Pairs..."
PAIRS_RES=$(curl -s -X GET "$API_URL/duplicates?status=pending" -H "Authorization: Bearer $TOKEN")
PAIR_ID=$(echo $PAIRS_RES | jq -r ".[] | select((.property1Id == \"$PROP_A_ID\" and .property2Id == \"$PROP_B_ID\") or (.property1Id == \"$PROP_B_ID\" and .property2Id == \"$PROP_A_ID\")) | .id")

if [ -z "$PAIR_ID" ]; then
  echo "Duplicate pair not found in scan results!"
  exit 1
fi
echo "Pair ID identified: $PAIR_ID"

# 7. Execute Merge (B into A)
echo "Merging Property B into Property A..."
MERGE_RES=$(curl -s -X POST "$API_URL/duplicates/$PAIR_ID/merge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"keepId\": \"$PROP_A_ID\", \"removeId\": \"$PROP_B_ID\"}")

echo "Merge result: $MERGE_RES"

# 8. Verification
echo "Verifying merged property ownership..."
FINAL_PROP_A=$(curl -s -X GET "$API_URL/properties/$PROP_A_ID" -H "Authorization: Bearer $TOKEN")
STAKE_COUNT=$(echo $FINAL_PROP_A | jq '.companies | length')
echo "Ownership stake count on Property A: $STAKE_COUNT (Expected: 2)"

DELETED_PROP_B=$(curl -s -X GET "$API_URL/properties/$PROP_B_ID" -H "Authorization: Bearer $TOKEN")
MSG=$(echo $DELETED_PROP_B | jq -r '.message')
echo "Property B status check: $MSG (Expected: Property not found)"

echo "Validation complete."

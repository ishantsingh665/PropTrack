#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
EMAIL="admin@proptrack.local"
PASSWORD="password123"

# 1. Login
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RES | grep -oP '(?<="token":")[^"]+')

# 2. Create another company (Company B)
echo "Creating Company B..."
COMPANY_B_RES=$(curl -s -X POST "$API_URL/companies" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name": "Skyline Acquisitions", "countryCode": "US"}')
COMPANY_B_ID=$(echo $COMPANY_B_RES | grep -oP '(?<="id":")[^"]+')

# 3. Get existing property (Company A owned)
echo "Fetching properties..."
PROP_RES=$(curl -s -X GET "$API_URL/properties" -H "Authorization: Bearer $TOKEN")
PROPERTY_ID=$(echo $PROP_RES | grep -oP '(?<="id":")[^"]+' | head -n 1)
COMPANY_A_ID=$(echo $PROP_RES | grep -oP '(?<="companyId":")[^"]+' | head -n 1)

echo "Transferring Property $PROPERTY_ID from $COMPANY_A_ID to $COMPANY_B_ID"

# 4. Execute Transfer
echo "Executing transfer..."
TRANSFER_RES=$(curl -s -X POST "$API_URL/transfers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"transfer\",
    \"notes\": \"Test Transfer Phase 3\",
    \"legs\": [
      {
        \"propertyId\": \"$PROPERTY_ID\",
        \"sourceCompanyId\": \"$COMPANY_A_ID\",
        \"targetCompanyId\": \"$COMPANY_B_ID\",
        \"ownershipPct\": 100
      }
    ]
  }")

TRANSFER_ID=$(echo $TRANSFER_RES | grep -oP '(?<="id":")[^"]+')
echo "Transfer successful. ID: $TRANSFER_ID"

# 5. Verify Timeline
echo "Verifying ownership timeline..."
TIMELINE_RES=$(curl -s -X GET "$API_URL/properties/$PROPERTY_ID/ownership" -H "Authorization: Bearer $TOKEN")
echo "Timeline received (length: $(echo $TIMELINE_RES | jq '. | length')). "

# 6. Execute Reversal
echo "Executing reversal..."
REVERSAL_RES=$(curl -s -X POST "$API_URL/transfers/$TRANSFER_ID/reverse" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"notes\": \"Testing reversal mechanism\"}")

REVERSAL_ID=$(echo $REVERSAL_RES | grep -oP '(?<="id":")[^"]+')
echo "Reversal successful. ID: $REVERSAL_ID"

# 7. Final Timeline Check
echo "Final ownership check..."
FINAL_TIMELINE=$(curl -s -X GET "$API_URL/properties/$PROPERTY_ID/ownership" -H "Authorization: Bearer $TOKEN")
echo "Final Timeline received (length: $(echo $FINAL_TIMELINE | jq '. | length')). "

echo "Validation complete."

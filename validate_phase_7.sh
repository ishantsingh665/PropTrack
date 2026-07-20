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

# 2. Get IDs for CSV
COMPANY_ID=$(curl -s -X GET "$API_URL/companies" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
TYPE_ID=$(curl -s -X GET "$API_URL/property-types" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].children[0].id')

echo "Using Company ID: $COMPANY_ID, Type ID: $TYPE_ID"

# 3. Create Test CSV
cat <<EOF > test_import.csv
name,addressLine1,city,countryCode,propertyTypeId,companyId,gfaValue,gfaUnit
Imported Building 1,Import St 1,Berlin,DE,$TYPE_ID,$COMPANY_ID,5000,sqm
Imported Building 2,Import St 2,Berlin,DE,$TYPE_ID,$COMPANY_ID,10000,sqft
Invalid Row,Missing City,,DE,$TYPE_ID,$COMPANY_ID,0,sqft
EOF

echo "Test CSV created."

# 4. Upload CSV
echo "Uploading CSV..."
IMPORT_RES=$(curl -s -X POST "$API_URL/import" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test_import.csv")
JOB_ID=$(echo $IMPORT_RES | jq -r '.jobId')

echo "Import job started. ID: $JOB_ID"

# 5. Wait and Check Status
echo "Waiting for job to complete..."
sleep 5
JOB_STATUS=$(curl -s -X GET "$API_URL/import/$JOB_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo $JOB_STATUS | jq -r '.status')
ROW_COUNT=$(echo $JOB_STATUS | jq -r '.rowCount')
ERROR_LOG=$(echo $JOB_STATUS | jq -r '.errorLog')

echo "Job Status: $STATUS, Rows: $ROW_COUNT"
if [ "$STATUS" == "completed" ]; then
  echo "✅ Import job completed."
  if [ "$ERROR_LOG" != "null" ]; then
    echo "⚠️ Partial errors found: $ERROR_LOG"
  fi
else
  echo "❌ Import job failed or still processing. Status: $STATUS"
fi

# 6. Verify Properties Created
echo "Verifying properties in DB..."
PROP_COUNT=$(curl -s -X GET "$API_URL/properties?companyId=$COMPANY_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data | map(select(.name | contains("Imported"))) | length')

if [ "$PROP_COUNT" == "2" ]; then
  echo "✅ 2 imported properties found in database."
else
  echo "❌ Expected 2 imported properties, found $PROP_COUNT"
fi

# Cleanup
rm test_import.csv
echo "Validation complete."

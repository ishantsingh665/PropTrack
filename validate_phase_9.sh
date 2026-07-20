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

# 2. Check Gate Status (Initially likely closed if setting is missing or old)
echo "Checking snapshot gate status..."
GATE_RES=$(curl -s -X GET "$API_URL/snapshots/gate-status" -H "Authorization: Bearer $ADMIN_TOKEN")
IS_OPEN=$(echo $GATE_RES | jq -r '.isOpen')

echo "Gate Open: $IS_OPEN"

# 3. Try to create a company (Should fail if gate is closed)
if [ "$IS_OPEN" == "false" ]; then
  echo "Testing gate lock: Creating a company (should fail)..."
  FAIL_RES=$(curl -s -X POST "$API_URL/companies" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "Gate Test Co", "countryCode": "DE"}')
  
  ERR_MSG=$(echo $FAIL_RES | jq -r '.error')
  echo "Error message: $ERR_MSG"
  
  if [ "$ERR_MSG" == "Snapshot Gate Locked" ]; then
    echo "✅ Gate is successfully locking data entry."
  else
    echo "❌ Gate failed to lock data entry."
  fi
fi

# 4. Take Snapshot
echo "Taking snapshot for current month..."
SNAP_RES=$(curl -s -X POST "$API_URL/snapshots" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Snapshot Response: $(echo $SNAP_RES | jq -r '.message')"

# 5. Check Gate Status again
echo "Checking gate status after snapshot..."
GATE_RES_2=$(curl -s -X GET "$API_URL/snapshots/gate-status" -H "Authorization: Bearer $ADMIN_TOKEN")
IS_OPEN_2=$(echo $GATE_RES_2 | jq -r '.isOpen')

echo "Gate Open: $IS_OPEN_2"

if [ "$IS_OPEN_2" == "true" ]; then
  echo "✅ Gate is now open."
else
  echo "❌ Gate is still closed after snapshot."
fi

# 6. Verify data entry works now
echo "Creating a company (should succeed now)..."
SUCCESS_RES=$(curl -s -X POST "$API_URL/companies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Gate Success Co", "countryCode": "DE"}')
CO_ID=$(echo $SUCCESS_RES | jq -r '.id')

if [ "$CO_ID" != "null" ] && [ -n "$CO_ID" ]; then
  echo "✅ Company created successfully. ID: $CO_ID"
else
  echo "❌ Failed to create company even with open gate."
fi

# 7. Check Dashboard
echo "Fetching dashboard for company..."
DASH_RES=$(curl -s -X GET "$API_URL/dashboard/$CO_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
CURR_COUNT=$(echo $DASH_RES | jq -r '.current.propertyCount')
echo "Dashboard Property Count: $CURR_COUNT"

echo "Validation complete."

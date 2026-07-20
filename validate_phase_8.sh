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

# 2. Get a Company ID
COMPANY_ID=$(curl -s -X GET "$API_URL/companies" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')
echo "Using Company ID: $COMPANY_ID"

# 3. Create a Note
echo "Creating a note..."
NOTE_RES=$(curl -s -X POST "$API_URL/companies/$COMPANY_ID/notes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Note", "content": "This is a test research note."}')
NOTE_ID=$(echo $NOTE_RES | jq -r '.id')
echo "Note created. ID: $NOTE_ID"

# 4. Update the Note
echo "Updating the note..."
curl -s -X PUT "$API_URL/companies/$COMPANY_ID/notes/$NOTE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Note Updated", "content": "Updated content."}' > /dev/null

# 5. List Notes
echo "Listing notes for company..."
NOTES_LIST=$(curl -s -X GET "$API_URL/companies/$COMPANY_ID/notes" -H "Authorization: Bearer $ADMIN_TOKEN")
NOTE_TITLE=$(echo $NOTES_LIST | jq -r "map(select(.id == \"$NOTE_ID\"))[0].title")

if [ "$NOTE_TITLE" == "Test Note Updated" ]; then
  echo "✅ Note created and updated successfully."
else
  echo "❌ Note update failed. Got title: $NOTE_TITLE"
fi

# 6. Test Attachment (Optional/Speculative if MinIO is not up)
echo "Testing attachment upload (requires MinIO)..."
echo "Hello MinIO" > test_file.txt
ATTACH_RES=$(curl -s -X POST "$API_URL/notes/$NOTE_ID/attachments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test_file.txt")
ATTACH_ID=$(echo $ATTACH_RES | jq -r '.id')

if [ "$ATTACH_ID" != "null" ] && [ -n "$ATTACH_ID" ]; then
  echo "✅ Attachment uploaded. ID: $ATTACH_ID"
  
  # Get download URL
  DOWNLOAD_URL=$(curl -s -X GET "$API_URL/notes/$NOTE_ID/attachments/$ATTACH_ID/download" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.downloadUrl')
  if [[ "$DOWNLOAD_URL" == *"http"* ]]; then
    echo "✅ Presigned URL generated: $DOWNLOAD_URL"
  else
    echo "❌ Failed to generate presigned URL."
  fi

  # Delete attachment
  echo "Deleting attachment..."
  curl -s -X DELETE "$API_URL/notes/$NOTE_ID/attachments/$ATTACH_ID" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "Attachment deleted."
else
  echo "⚠️ Attachment upload failed (likely MinIO is not running)."
fi

# 7. Delete Note
echo "Deleting note..."
curl -s -X DELETE "$API_URL/companies/$COMPANY_ID/notes/$NOTE_ID" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
echo "Note soft-deleted."

rm test_file.txt
echo "Validation complete."

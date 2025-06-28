#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 '<magnet-link>'"
  exit 1
fi

MAGNET_LINK="$1"

echo "Starting stream..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/stream \
  -H "Content-Type: application/json" \
  -d "{\"magnet\": \"$MAGNET_LINK\"}")

STREAM_ID=$(echo "$RESPONSE" | grep -oP '(?<="streamId":")[^"]+')

if [ -z "$STREAM_ID" ]; then
  echo "Failed to start stream. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "Stream started. Stream ID: $STREAM_ID"
echo ""

# Wait for file(s) to be ready
echo "Waiting for files to be ready..."
for i in {1..30}; do
  STATUS=$(curl -s http://localhost:3000/api/stream/$STREAM_ID/status)

  FILES=$(echo "$STATUS" | grep -oP '(?<="files":\[)[^\]]*' | tr -d '"' | tr ',' '\n')
  if [ -n "$FILES" ]; then
    echo "Available files:"
    echo "$FILES"
    echo ""
    echo "To stream, use:"
    while read -r file; do
      echo "curl http://localhost:3000/api/stream/$STREAM_ID/$file"
    done <<< "$FILES"
    exit 0
  fi

  echo "Still loading... ($i)"
  sleep 2
done

echo "Timeout waiting for files. Response:"
echo "$STATUS"

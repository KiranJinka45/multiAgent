#!/bin/bash

echo "☢️  Kicking off CHAOS TEST..."

services=("gateway" "core-api" "worker")

while true; do
  # Pick a random service
  target=${services[$RANDOM % ${#services[@]}]}
  
  echo "💥 Killing $target container..."
  docker-compose stop "$target"
  
  sleep 5
  
  echo "♻️  Verifying auto-restart (health-check)..."
  docker-compose start "$target"
  
  # Wait 30s before next strike
  echo "⏳ Waiting for recovery..."
  sleep 30
done

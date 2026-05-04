#!/bin/bash
# MultiAgent Production Smoke Test Suite

SET_COLOR_GREEN='\033[0;32m'
SET_COLOR_RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting Production Smoke Tests..."

SERVICES=(
  "http://127.0.0.1:4000/health|Gateway"
  "http://127.0.0.1:4002/health|Auth"
  "http://127.0.0.1:4003/health|Billing"
  "http://127.0.0.1:4001/health|Core-API"
)

FAILS=0

for item in "${SERVICES[@]}"; do
  URL="${item%%|*}"
  NAME="${item##*|}"
  
  echo -n "Checking $NAME ($URL)... "
  
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  
  if [ "$RESPONSE" -eq 200 ]; then
    echo -e "${SET_COLOR_GREEN}PASS (200)${NC}"
  else
    echo -e "${SET_COLOR_RED}FAIL ($RESPONSE)${NC}"
    FAILS=$((FAILS + 1))
  fi
done

echo "---------------------------------------"
if [ "$FAILS" -eq 0 ]; then
  echo -e "${SET_COLOR_GREEN}✅ All systems operational.${NC}"
  exit 0
else
  echo -e "${SET_COLOR_RED}❌ $FAILS services failed health check.${NC}"
  exit 1
fi

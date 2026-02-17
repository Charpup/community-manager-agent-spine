#!/bin/bash
# API Endpoint Tests for Spine v0.7a

BASE_URL="http://localhost:3001"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local url=$2
  echo "Testing: $name"
  
  response=$(curl -s -w "%{http_code}" "$url")
  http_code=$(echo "$response" | tail -c 4)
  body=$(echo "$response" | head -c -4)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} ($http_code)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} ($http_code)"
    echo "Response: $body"
    ((FAILED++))
  fi
  echo ""
}

echo "================================"
echo "Spine API Endpoint Tests"
echo "================================"
echo ""

# Test 1: Health check
test_endpoint "GET /api/health" "$BASE_URL/api/health"

# Test 2: Stats overview
test_endpoint "GET /api/stats/overview" "$BASE_URL/api/stats/overview"

# Test 3: Tickets list
test_endpoint "GET /api/tickets" "$BASE_URL/api/tickets"

# Test 4: Tickets list with pagination
test_endpoint "GET /api/tickets?page=1&limit=5" "$BASE_URL/api/tickets?page=1&limit=5"

# Test 5: Cruise reports
test_endpoint "GET /api/cruise-reports" "$BASE_URL/api/cruise-reports"

echo "================================"
echo "Test Summary: $PASSED passed, $FAILED failed"
echo "================================"

exit $FAILED

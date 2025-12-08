#!/bin/bash
set -e

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

echo "🧪 Testing PhishGuard Academy API"
echo "=================================="

# Test 1: OCR Status
echo -n "Test 1: OCR Status... "
if curl -sf "$BASE_URL/ocr_status" | jq -e '.pytesseract_imported' > /dev/null 2>&1; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

# Test 2: Text Analysis
echo -n "Test 2: Text Analysis... "
if curl -sf -X POST "$BASE_URL/analyze_text" \
  -H "Content-Type: application/json" \
  -d '{"text":"Urgent account verification http://fake-bank.co"}' \
  | jq -e '.urls | length > 0' > /dev/null 2>&1; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

# Test 3: Root redirect
echo -n "Test 3: Root Redirect... "
if curl -sI "$BASE_URL/" 2>&1 | grep -q "301"; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

# Test 4: Frontend loads
echo -n "Test 4: Frontend Loads... "
if curl -sf "$BASE_URL/app/" 2>&1 | grep -q "<!doctype html>"; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

# Test 5: Model metadata
echo -n "Test 5: Model Metadata... "
if curl -sf "$BASE_URL/ocr_status" 2>&1 | jq -e '.model.present == true' > /dev/null 2>&1; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

# Test 6: CORS headers
echo -n "Test 6: CORS Headers... "
if curl -sI "$BASE_URL/ocr_status" 2>&1 | grep -iq "access-control-allow"; then
  echo "✓ PASS"
  ((PASS++))
else
  echo "✗ FAIL"
  ((FAIL++))
fi

echo "=================================="
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi

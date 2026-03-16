#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Gemini API Key Rotation Tester
# ============================================
# Reads GEMINI_API_KEYS from .env file and tests
# each key to verify they all work.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Load API keys from .env file
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading API keys from: $ENV_FILE"
  # Source .env, handling both GEMINI_API_KEYS and legacy GEMINI_API_KEY
  set -a
  source <(grep -E '^GEMINI_API_KEY(S)?=' "$ENV_FILE" | sed 's/^/export /')
  set +a
else
  echo "ERROR: .env file not found at $ENV_FILE"
  echo ""
  echo "Please create it by copying the example:"
  echo "  cp $PROJECT_ROOT/env.example $PROJECT_ROOT/.env"
  echo ""
  echo "Then edit .env and add your GEMINI_API_KEYS"
  exit 1
fi

# Support both new and legacy env var
API_KEYS="${GEMINI_API_KEYS:-${GEMINI_API_KEY:-}}"

if [[ -z "$API_KEYS" ]]; then
  echo "ERROR: GEMINI_API_KEYS not found in .env file"
  exit 1
fi

# Split comma-separated keys into array
IFS=',' read -ra KEYS_ARRAY <<< "$API_KEYS"

echo "============================================"
echo "Found ${#KEYS_ARRAY[@]} API key(s) to test"
echo "============================================"
echo ""

REQUIRED_MODEL="gemini-2.5-flash"
VALID_KEYS=0
INVALID_KEYS=0

for i in "${!KEYS_ARRAY[@]}"; do
  KEY="${KEYS_ARRAY[$i]}"
  KEY="${KEY#"${KEY%%[![:space:]]*}"}"  # trim leading
  KEY="${KEY%"${KEY##*[![:space:]]}"}"  # trim trailing
  KEY_NUM=$((i + 1))
  KEY_PREVIEW="${KEY:0:10}..."
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Testing Key #${KEY_NUM}: ${KEY_PREVIEW}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Check for placeholder values
  if [[ "$KEY" == "your_gemini_api_key_here" ]] || \
     [[ "$KEY" == "your_actual_gemini_api_key_here" ]] || \
     [[ "$KEY" == "REPLACE_WITH_YOUR_ACTUAL_GEMINI_API_KEY" ]]; then
    echo "⚠️  SKIPPED: Placeholder value detected"
    echo ""
    continue
  fi
  
  # Test the key with our required model
  url="https://generativelanguage.googleapis.com/v1beta/models/${REQUIRED_MODEL}:generateContent?key=${KEY}"
  payload='{"contents":[{"parts":[{"text":"ping"}]}]}'
  
  http_code=$(curl -s -o /tmp/gemini_resp_${i}.txt -w "%{http_code}" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$payload" --max-time 15 2>/dev/null || echo "000")

  if [[ "$http_code" = "200" ]]; then
    echo "✅ VALID - Key works with ${REQUIRED_MODEL}"
    VALID_KEYS=$((VALID_KEYS + 1))
  else
    echo "❌ FAILED - HTTP $http_code"
    # Show error details
    if [[ -f /tmp/gemini_resp_${i}.txt ]] && jq -e . /tmp/gemini_resp_${i}.txt >/dev/null 2>&1; then
      error_msg=$(jq -r '.error.message // "Unknown error"' /tmp/gemini_resp_${i}.txt 2>/dev/null)
      echo "   Error: $error_msg"
    fi
    INVALID_KEYS=$((INVALID_KEYS + 1))
  fi
  echo ""
done

echo "============================================"
echo "SUMMARY"
echo "============================================"
echo "Total keys:   ${#KEYS_ARRAY[@]}"
echo "Valid keys:   $VALID_KEYS ✅"
echo "Invalid keys: $INVALID_KEYS ❌"
echo ""

if [[ $VALID_KEYS -gt 0 ]]; then
  echo "🎉 Key rotation system ready with $VALID_KEYS working key(s)!"
  if [[ $VALID_KEYS -ge 3 ]]; then
    echo "   Excellent! Multiple keys will help avoid rate limits."
  elif [[ $VALID_KEYS -eq 1 ]]; then
    echo "   Consider adding more keys for better rate limit handling."
  fi
  exit 0
else
  echo "💀 No valid keys found. Please check your API keys."
  echo "   Get keys from: https://aistudio.google.com/app/apikey"
  exit 1
fi

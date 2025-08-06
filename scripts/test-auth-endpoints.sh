#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api/v1"
EMAIL="test$(date +%s)@example.com"  # Unique email
PASSWORD="password123"

echo -e "${BLUE}🔐 Testing E-Tour Authentication Endpoints${NC}"
echo "=============================================="
echo -e "Base URL: ${YELLOW}$BASE_URL${NC}"
echo -e "Test Email: ${YELLOW}$EMAIL${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    
    echo -e "${BLUE}Testing: $name${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    fi
    
    # Split response and status code
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $status_code"
    echo "Response: $body"
    
    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    echo "----------------------------------------"
    echo ""
}

# 1. Test Registration
echo -e "${YELLOW}1. Testing User Registration${NC}"
REGISTER_DATA="{
    \"name\": \"Test User\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"role\": \"client\"
}"

test_endpoint "User Registration" "POST" "/auth/register" "$REGISTER_DATA"

# 2. Test Login
echo -e "${YELLOW}2. Testing User Login${NC}"
LOGIN_DATA="{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
}"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token (basic extraction without jq)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}✅ Token extracted: ${TOKEN:0:50}...${NC}"
    AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""
else
    echo -e "${RED}❌ Failed to extract token${NC}"
    AUTH_HEADER=""
fi
echo "----------------------------------------"
echo ""

# 3. Test Get Profile (if token available)
if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}3. Testing Get Profile${NC}"
    test_endpoint "Get Profile" "GET" "/profile" "" "-H \"Authorization: Bearer $TOKEN\""
    
    # 4. Test Update Profile
    echo -e "${YELLOW}4. Testing Update Profile${NC}"
    UPDATE_DATA="{
        \"name\": \"Updated Test User\",
        \"phone\": \"+1234567890\"
    }"
    
    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/profile" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$UPDATE_DATA")
    
    status_code=$(echo "$UPDATE_RESPONSE" | tail -n1)
    body=$(echo "$UPDATE_RESPONSE" | head -n -1)
    
    echo "Update Profile Response:"
    echo "Status Code: $status_code"
    echo "Response: $body"
    
    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ Profile Update SUCCESS${NC}"
    else
        echo -e "${RED}❌ Profile Update FAILED${NC}"
    fi
    echo "----------------------------------------"
    echo ""
    
    # 5. Test Logout
    echo -e "${YELLOW}5. Testing Logout${NC}"
    test_endpoint "Logout" "POST" "/auth/logout" "" "-H \"Authorization: Bearer $TOKEN\""
else
    echo -e "${RED}❌ Skipping profile tests - no token available${NC}"
    echo ""
fi

# 6. Test Email Verification (will fail without real verification code)
echo -e "${YELLOW}6. Testing Email Verification${NC}"
VERIFY_DATA="{
    \"userId\": 1,
    \"code\": \"TEST123\"
}"

test_endpoint "Email Verification" "POST" "/auth/verify-email" "$VERIFY_DATA"

# 7. Test Password Reset Request
echo -e "${YELLOW}7. Testing Password Reset Request${NC}"
RESET_DATA="{
    \"email\": \"$EMAIL\"
}"

test_endpoint "Password Reset Request" "POST" "/auth/reset-password" "$RESET_DATA"

# 8. Test Password Reset Confirmation (will fail without real token)
echo -e "${YELLOW}8. Testing Password Reset Confirmation${NC}"
RESET_CONFIRM_DATA="{
    \"token\": \"fake-reset-token\",
    \"newPassword\": \"newpassword123\"
}"

test_endpoint "Password Reset Confirmation" "POST" "/auth/reset-password/confirm" "$RESET_CONFIRM_DATA"

# Test Error Cases
echo -e "${YELLOW}9. Testing Error Cases${NC}"

# Invalid login
echo -e "${BLUE}Testing Invalid Login${NC}"
INVALID_LOGIN_DATA="{
    \"email\": \"$EMAIL\",
    \"password\": \"wrongpassword\"
}"

test_endpoint "Invalid Login" "POST" "/auth/login" "$INVALID_LOGIN_DATA"

# Registration with existing email
echo -e "${BLUE}Testing Duplicate Registration${NC}"
test_endpoint "Duplicate Registration" "POST" "/auth/register" "$REGISTER_DATA"

# Access profile without token
echo -e "${BLUE}Testing Unauthorized Profile Access${NC}"
test_endpoint "Unauthorized Profile Access" "GET" "/profile" ""

echo -e "${GREEN}🎉 Authentication endpoint testing completed!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "- Registration: Creates new user account"
echo "- Login: Returns JWT token for authentication"
echo "- Profile: Get/Update user information (requires auth)"
echo "- Logout: Client-side token invalidation"
echo "- Email Verification: Verify email with code"
echo "- Password Reset: Request and confirm password reset"
echo ""
echo -e "${YELLOW}💡 Note: Some tests may fail due to missing verification codes or reset tokens${NC}"
echo -e "${YELLOW}   This is expected behavior for security endpoints${NC}"

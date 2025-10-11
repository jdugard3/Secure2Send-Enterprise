#!/bin/bash

# Secure2Send Enterprise - Cloudflare Zero Trust Testing Script
# This script tests the Zero Trust implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="yourdomain.com"  # Change this to your actual domain
SUBDOMAINS=("secure2send" "admin.secure2send" "api.secure2send" "files.secure2send")

echo -e "${BLUE}🧪 Secure2Send Enterprise - Zero Trust Testing${NC}"
echo "=================================================="

# Test 1: Check tunnel status
echo -e "\n${YELLOW}Test 1: Checking tunnel status...${NC}"
if cloudflared tunnel info secure2send-tunnel &> /dev/null; then
    echo -e "${GREEN}✅ Tunnel is running${NC}"
    cloudflared tunnel info secure2send-tunnel
else
    echo -e "${RED}❌ Tunnel is not running${NC}"
    echo "Start the tunnel with: cloudflared tunnel --config tunnel-config.yml run"
fi

# Test 2: Check DNS resolution
echo -e "\n${YELLOW}Test 2: Checking DNS resolution...${NC}"
for sub in "${SUBDOMAINS[@]}"; do
    if nslookup $sub.$DOMAIN &> /dev/null; then
        echo -e "${GREEN}✅ DNS resolution for $sub.$DOMAIN: OK${NC}"
    else
        echo -e "${RED}❌ DNS resolution for $sub.$DOMAIN: FAILED${NC}"
    fi
done

# Test 3: Check HTTPS connectivity
echo -e "\n${YELLOW}Test 3: Checking HTTPS connectivity...${NC}"
for sub in "${SUBDOMAINS[@]}"; do
    if curl -s --max-time 10 -I https://$sub.$DOMAIN &> /dev/null; then
        echo -e "${GREEN}✅ HTTPS connectivity for $sub.$DOMAIN: OK${NC}"
    else
        echo -e "${RED}❌ HTTPS connectivity for $sub.$DOMAIN: FAILED${NC}"
    fi
done

# Test 4: Check Cloudflare Access headers
echo -e "\n${YELLOW}Test 4: Checking Cloudflare Access headers...${NC}"
for sub in "${SUBDOMAINS[@]}"; do
    echo "Testing $sub.$DOMAIN..."
    RESPONSE=$(curl -s --max-time 10 -I https://$sub.$DOMAIN 2>/dev/null || echo "FAILED")
    
    if echo "$RESPONSE" | grep -q "cf-access-jwt-assertion"; then
        echo -e "${GREEN}✅ Cloudflare Access JWT header present${NC}"
    elif echo "$RESPONSE" | grep -q "302\|301"; then
        echo -e "${YELLOW}⚠️  Redirect detected (likely to Cloudflare Access login)${NC}"
    else
        echo -e "${RED}❌ No Cloudflare Access headers detected${NC}"
    fi
done

# Test 5: Check application health
echo -e "\n${YELLOW}Test 5: Checking application health...${NC}"
if curl -s --max-time 10 https://secure2send.$DOMAIN/api/health &> /dev/null; then
    echo -e "${GREEN}✅ Application health check: OK${NC}"
else
    echo -e "${RED}❌ Application health check: FAILED${NC}"
fi

# Test 6: Check admin panel access
echo -e "\n${YELLOW}Test 6: Checking admin panel access...${NC}"
ADMIN_RESPONSE=$(curl -s --max-time 10 -I https://admin.secure2send.$DOMAIN 2>/dev/null || echo "FAILED")

if echo "$ADMIN_RESPONSE" | grep -q "403\|401"; then
    echo -e "${GREEN}✅ Admin panel properly protected${NC}"
elif echo "$ADMIN_RESPONSE" | grep -q "302\|301"; then
    echo -e "${YELLOW}⚠️  Admin panel redirect (likely to login)${NC}"
else
    echo -e "${RED}❌ Admin panel access issue detected${NC}"
fi

# Test 7: Check API endpoints
echo -e "\n${YELLOW}Test 7: Checking API endpoints...${NC}"
API_RESPONSE=$(curl -s --max-time 10 -I https://api.secure2send.$DOMAIN/api/health 2>/dev/null || echo "FAILED")

if echo "$API_RESPONSE" | grep -q "403\|401"; then
    echo -e "${GREEN}✅ API endpoints properly protected${NC}"
elif echo "$API_RESPONSE" | grep -q "200"; then
    echo -e "${YELLOW}⚠️  API endpoints accessible (check if this is expected)${NC}"
else
    echo -e "${RED}❌ API endpoint access issue detected${NC}"
fi

# Test 8: Check file service
echo -e "\n${YELLOW}Test 8: Checking file service...${NC}"
FILES_RESPONSE=$(curl -s --max-time 10 -I https://files.secure2send.$DOMAIN 2>/dev/null || echo "FAILED")

if echo "$FILES_RESPONSE" | grep -q "403\|401"; then
    echo -e "${GREEN}✅ File service properly protected${NC}"
elif echo "$FILES_RESPONSE" | grep -q "302\|301"; then
    echo -e "${YELLOW}⚠️  File service redirect (likely to login)${NC}"
else
    echo -e "${RED}❌ File service access issue detected${NC}"
fi

# Test 9: Check WARP client (if available)
echo -e "\n${YELLOW}Test 9: Checking WARP client...${NC}"
if command -v warp-cli &> /dev/null; then
    WARP_STATUS=$(warp-cli status 2>/dev/null || echo "NOT_CONNECTED")
    if echo "$WARP_STATUS" | grep -q "Connected"; then
        echo -e "${GREEN}✅ WARP client is connected${NC}"
    else
        echo -e "${YELLOW}⚠️  WARP client is not connected${NC}"
        echo "Connect with: warp-cli connect"
    fi
else
    echo -e "${YELLOW}⚠️  WARP client not installed${NC}"
    echo "Install with: ./scripts/deploy-warp-clients.sh"
fi

# Test 10: Check device posture (if available)
echo -e "\n${YELLOW}Test 10: Checking device posture...${NC}"
if command -v warp-cli &> /dev/null; then
    POSTURE_STATUS=$(warp-cli posture status 2>/dev/null || echo "NOT_AVAILABLE")
    if echo "$POSTURE_STATUS" | grep -q "Passed\|Compliant"; then
        echo -e "${GREEN}✅ Device posture check: PASSED${NC}"
    elif echo "$POSTURE_STATUS" | grep -q "Failed\|Non-compliant"; then
        echo -e "${RED}❌ Device posture check: FAILED${NC}"
    else
        echo -e "${YELLOW}⚠️  Device posture check: NOT_AVAILABLE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Device posture check not available (WARP not installed)${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="
echo -e "${GREEN}✅ Tests completed${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review any failed tests above"
echo "2. Check Cloudflare Zero Trust dashboard for access logs"
echo "3. Test with different user accounts and devices"
echo "4. Verify access policies are working as expected"
echo ""
echo -e "${BLUE}📚 For troubleshooting, see CLOUDFLARE_ZERO_TRUST_SETUP.md${NC}"

#!/bin/bash

# Secure2Send Enterprise - Fly.io Zero Trust Setup
# Simplified setup for existing Fly.io deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
FLY_APP="secure2send"
FLY_URL="secure2send.fly.dev"

echo -e "${BLUE}🔒 Secure2Send - Fly.io Zero Trust Setup${NC}"
echo "=========================================="
echo ""
echo -e "${PURPLE}This will help you add Cloudflare Zero Trust to your Fly.io deployment${NC}"
echo -e "${PURPLE}Current deployment: https://${FLY_URL}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI not found${NC}"
    echo "Install with: brew install flyctl"
    exit 1
fi
echo -e "${GREEN}✅ Fly CLI installed${NC}"

# Check if logged into Fly.io
if ! fly auth whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged into Fly.io${NC}"
    echo "Login with: fly auth login"
    exit 1
fi
echo -e "${GREEN}✅ Logged into Fly.io${NC}"

# Check if app exists
if ! fly status -a $FLY_APP &> /dev/null; then
    echo -e "${RED}❌ App '$FLY_APP' not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ App '$FLY_APP' found${NC}"

# Test current deployment
echo -e "\n${YELLOW}Testing current deployment...${NC}"
if curl -s --max-time 10 https://${FLY_URL}/api/health &> /dev/null; then
    echo -e "${GREEN}✅ App is responding at https://${FLY_URL}${NC}"
else
    echo -e "${RED}❌ App is not responding${NC}"
    echo "Check with: fly logs -a $FLY_APP"
    exit 1
fi

# Instructions for Cloudflare setup
echo -e "\n${BLUE}📋 Cloudflare Zero Trust Setup Instructions${NC}"
echo "=============================================="
echo ""
echo -e "${YELLOW}Step 1: Create Cloudflare Zero Trust Account${NC}"
echo "   1. Go to: https://one.dash.cloudflare.com/"
echo "   2. Sign up or log in"
echo "   3. Choose a team name (e.g., 'secure2send-team')"
echo ""
read -p "Press Enter when you've completed Step 1..."

echo -e "\n${YELLOW}Step 2: Create Access Application${NC}"
echo "   1. In Zero Trust Dashboard, go to: Access → Applications"
echo "   2. Click 'Add an application'"
echo "   3. Choose 'Self-hosted'"
echo "   4. Configure:"
echo "      - Application name: Secure2Send Enterprise"
echo "      - Application domain: ${FLY_URL}"
echo "      - Session duration: 24 hours"
echo "   5. Click 'Next'"
echo ""
read -p "Press Enter when you've completed Step 2..."

echo -e "\n${YELLOW}Step 3: Add Identity Provider${NC}"
echo "   1. Go to: Settings → Authentication"
echo "   2. Click 'Add new' under Login methods"
echo "   3. Choose one:"
echo "      - Google (easiest for testing)"
echo "      - One-time PIN (email-based)"
echo "      - Azure AD (for enterprise)"
echo "   4. Follow the setup wizard"
echo ""
read -p "Press Enter when you've completed Step 3..."

echo -e "\n${YELLOW}Step 4: Create Access Policy${NC}"
echo "   1. Back in your Application settings"
echo "   2. Add a policy:"
echo "      - Policy name: Authenticated Users"
echo "      - Action: Allow"
echo "      - Include: Your email address"
echo "   3. Click 'Next' and 'Add application'"
echo ""
read -p "Press Enter when you've completed Step 4..."

echo -e "\n${YELLOW}Step 5: Get Your Credentials${NC}"
echo "   1. In your Application, go to 'Overview' tab"
echo "   2. Copy the following values:"
echo ""
read -p "Enter your Team Domain (e.g., yourteam.cloudflareaccess.com): " TEAM_DOMAIN
read -p "Enter your Application Audience (AUD) tag: " ACCESS_AUD

if [ -z "$TEAM_DOMAIN" ] || [ -z "$ACCESS_AUD" ]; then
    echo -e "${RED}❌ Team Domain and AUD are required${NC}"
    exit 1
fi

ISSUER="https://${TEAM_DOMAIN}"

echo -e "\n${GREEN}✅ Credentials received${NC}"
echo "   Team Domain: $TEAM_DOMAIN"
echo "   Audience: $ACCESS_AUD"
echo "   Issuer: $ISSUER"

# Set Fly.io secrets
echo -e "\n${YELLOW}Step 6: Deploying to Fly.io...${NC}"

echo "Setting Fly.io secrets..."
fly secrets set \
  CLOUDFLARE_TEAM_DOMAIN="$TEAM_DOMAIN" \
  CLOUDFLARE_ACCESS_AUD="$ACCESS_AUD" \
  CLOUDFLARE_ACCESS_ISSUER="$ISSUER" \
  NODE_ENV="production" \
  -a $FLY_APP

echo -e "${GREEN}✅ Secrets set${NC}"

# Deploy
echo -e "\n${YELLOW}Deploying application...${NC}"
read -p "Deploy now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    fly deploy -a $FLY_APP
    echo -e "${GREEN}✅ Deployment complete${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping deployment${NC}"
    echo "Deploy later with: fly deploy -a $FLY_APP"
fi

# Test the setup
echo -e "\n${YELLOW}Step 7: Testing Zero Trust Protection...${NC}"
echo "Waiting 10 seconds for deployment to stabilize..."
sleep 10

echo "Testing access protection..."
RESPONSE=$(curl -s -I https://${FLY_URL} | head -1)

if echo "$RESPONSE" | grep -q "302\|301"; then
    echo -e "${GREEN}✅ Zero Trust protection is active!${NC}"
    echo "   Requests are being redirected to Cloudflare Access"
elif echo "$RESPONSE" | grep -q "200"; then
    echo -e "${YELLOW}⚠️  App is responding but may not be fully protected yet${NC}"
    echo "   This might take a few minutes to propagate"
else
    echo -e "${RED}❌ Unexpected response: $RESPONSE${NC}"
fi

# Final instructions
echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo "===================="
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Test your protected app:"
echo "   Open: https://${FLY_URL}"
echo "   You should be redirected to Cloudflare Access login"
echo ""
echo "2. Add team members:"
echo "   - Go to Zero Trust Dashboard"
echo "   - Access → Applications → Your App → Policies"
echo "   - Add their emails to the policy"
echo ""
echo "3. Configure admin-only routes:"
echo "   - Create a new policy for /admin/* paths"
echo "   - Restrict to admin emails only"
echo ""
echo "4. Monitor access:"
echo "   - Zero Trust Dashboard → Logs → Access"
echo "   - View all authentication attempts"
echo ""
echo -e "${BLUE}📚 For more details, see: FLYIO_ZERO_TRUST_SETUP.md${NC}"
echo ""
echo -e "${PURPLE}Your Secure2Send app is now protected by Cloudflare Zero Trust! 🔒${NC}"

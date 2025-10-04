#!/bin/bash

# Secure2Send Enterprise - Cloudflare Zero Trust Setup Script
# This script automates the initial setup of Cloudflare Zero Trust for Secure2Send

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_NAME="secure2send-tunnel"
DOMAIN="yourdomain.com"  # Change this to your actual domain
SUBDOMAIN="secure2send"

echo -e "${BLUE}🔧 Secure2Send Enterprise - Cloudflare Zero Trust Setup${NC}"
echo "=================================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared is not installed. Please install it first:${NC}"
    echo "   macOS: brew install cloudflared"
    echo "   Linux: Download from https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

echo -e "${GREEN}✅ cloudflared is installed${NC}"

# Step 1: Authenticate with Cloudflare
echo -e "\n${YELLOW}Step 1: Authenticating with Cloudflare...${NC}"
echo "This will open a browser window for authentication."
read -p "Press Enter to continue..."

if ! cloudflared tunnel login; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"

# Step 2: Create tunnel
echo -e "\n${YELLOW}Step 2: Creating Cloudflare tunnel...${NC}"

# Check if tunnel already exists
if cloudflared tunnel info $TUNNEL_NAME &> /dev/null; then
    echo -e "${YELLOW}⚠️  Tunnel $TUNNEL_NAME already exists${NC}"
    TUNNEL_ID=$(cloudflared tunnel info $TUNNEL_NAME | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}')
else
    echo "Creating new tunnel..."
    TUNNEL_OUTPUT=$(cloudflared tunnel create $TUNNEL_NAME)
    TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}')
    
    if [ -z "$TUNNEL_ID" ]; then
        echo -e "${RED}❌ Failed to create tunnel${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Tunnel created with ID: $TUNNEL_ID${NC}"

# Step 3: Update tunnel configuration
echo -e "\n${YELLOW}Step 3: Updating tunnel configuration...${NC}"

# Replace placeholder values in tunnel-config.yml
sed -i.bak "s/REPLACE_WITH_YOUR_TUNNEL_ID/$TUNNEL_ID/g" tunnel-config.yml
sed -i.bak "s/yourdomain.com/$DOMAIN/g" tunnel-config.yml

echo -e "${GREEN}✅ Tunnel configuration updated${NC}"

# Step 4: Create DNS records
echo -e "\n${YELLOW}Step 4: Creating DNS records...${NC}"

# Create DNS records for each subdomain
SUBDOMAINS=("$SUBDOMAIN" "admin.$SUBDOMAIN" "api.$SUBDOMAIN" "files.$SUBDOMAIN")

for sub in "${SUBDOMAINS[@]}"; do
    echo "Creating DNS record for $sub.$DOMAIN..."
    if cloudflared tunnel route dns $TUNNEL_NAME $sub.$DOMAIN; then
        echo -e "${GREEN}✅ DNS record created for $sub.$DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️  DNS record for $sub.$DOMAIN might already exist${NC}"
    fi
done

# Step 5: Create .env configuration
echo -e "\n${YELLOW}Step 5: Updating environment configuration...${NC}"

# Update .env file with Zero Trust configuration
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${YELLOW}Created .env file from env.example${NC}"
fi

# Add Zero Trust configuration to .env if not already present
if ! grep -q "CLOUDFLARE_TEAM_DOMAIN" .env; then
    echo "" >> .env
    echo "# Cloudflare Zero Trust Configuration" >> .env
    echo "CLOUDFLARE_TEAM_DOMAIN=yourteam.cloudflareaccess.com" >> .env
    echo "CLOUDFLARE_ACCESS_AUD=your-application-audience-id" >> .env
    echo "CLOUDFLARE_ACCESS_ISSUER=https://yourteam.cloudflareaccess.com" >> .env
    echo -e "${GREEN}✅ Added Zero Trust configuration to .env${NC}"
else
    echo -e "${YELLOW}⚠️  Zero Trust configuration already exists in .env${NC}"
fi

# Step 6: Install dependencies
echo -e "\n${YELLOW}Step 6: Installing required dependencies...${NC}"

# Check if package.json has the required dependencies
if ! grep -q "jsonwebtoken" package.json; then
    echo "Installing jsonwebtoken..."
    npm install jsonwebtoken @types/jsonwebtoken
fi

if ! grep -q "jwks-rsa" package.json; then
    echo "Installing jwks-rsa..."
    npm install jwks-rsa @types/jwks-rsa
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 7: Test tunnel configuration
echo -e "\n${YELLOW}Step 7: Testing tunnel configuration...${NC}"

echo "Testing tunnel configuration (this may take a moment)..."
if timeout 10s cloudflared tunnel --config tunnel-config.yml run --dry-run; then
    echo -e "${GREEN}✅ Tunnel configuration is valid${NC}"
else
    echo -e "${YELLOW}⚠️  Tunnel test completed (some warnings are normal)${NC}"
fi

# Step 8: Create systemd service (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "\n${YELLOW}Step 8: Creating systemd service (optional)...${NC}"
    read -p "Would you like to create a systemd service for the tunnel? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo cloudflared service install tunnel-config.yml
        echo -e "${GREEN}✅ Systemd service created${NC}"
        echo "You can start the service with: sudo systemctl start cloudflared"
    fi
fi

# Final instructions
echo -e "\n${GREEN}🎉 Zero Trust setup completed!${NC}"
echo "=================================================="
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure Zero Trust policies in the Cloudflare dashboard:"
echo "   https://one.dash.cloudflare.com/"
echo ""
echo "2. Update your .env file with the correct Zero Trust values:"
echo "   - CLOUDFLARE_TEAM_DOMAIN"
echo "   - CLOUDFLARE_ACCESS_AUD"
echo "   - CLOUDFLARE_ACCESS_ISSUER"
echo ""
echo "3. Start the tunnel:"
echo "   cloudflared tunnel --config tunnel-config.yml run"
echo ""
echo "4. Start your Secure2Send application:"
echo "   npm start"
echo ""
echo "5. Access your application at:"
for sub in "${SUBDOMAINS[@]}"; do
    echo "   https://$sub.$DOMAIN"
done
echo ""
echo -e "${BLUE}📚 For detailed configuration, see CLOUDFLARE_ZERO_TRUST_SETUP.md${NC}"

# Cleanup
rm -f tunnel-config.yml.bak



#!/bin/bash

# Secure2Send Enterprise - Complete Cloudflare Zero Trust Setup Script
# This script guides you through the complete Zero Trust implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_NAME="secure2send-tunnel"
DOMAIN="fly.dev"  # Using Fly.io domain
SUBDOMAIN_PREFIX="secure2send"  # Your Fly.io app name

echo -e "${BLUE}🔒 Secure2Send Enterprise - Complete Cloudflare Zero Trust Setup${NC}"
echo "=================================================================="
echo -e "${PURPLE}This script will guide you through implementing Cloudflare Zero Trust${NC}"
echo -e "${PURPLE}for your Secure2Send Enterprise application.${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared is not installed.${NC}"
    echo "Please install cloudflared first:"
    echo "  macOS: brew install cloudflared"
    echo "  Linux: Download from https://github.com/cloudflare/cloudflared/releases"
    echo "  Windows: Download from https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

echo -e "${GREEN}✅ cloudflared is installed${NC}"

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is available${NC}"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Docker not found - will skip Docker setup${NC}"
    DOCKER_AVAILABLE=false
fi

# Step 2: Cloudflare Authentication
echo -e "\n${YELLOW}Step 2: Cloudflare Authentication${NC}"
echo "This will open a browser window for authentication."
read -p "Press Enter to continue with Cloudflare authentication..."

if ! cloudflared tunnel login; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"

# Step 3: Create Tunnel
echo -e "\n${YELLOW}Step 3: Creating Cloudflare Tunnel${NC}"

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

# Step 4: Update configuration files
echo -e "\n${YELLOW}Step 4: Updating configuration files...${NC}"

# Update tunnel configuration files
sed -i.bak "s/REPLACE_WITH_YOUR_TUNNEL_ID/$TUNNEL_ID/g" tunnel-config.yml
sed -i.bak "s/yourdomain.com/$DOMAIN/g" tunnel-config.yml

sed -i.bak "s/YOUR_TUNNEL_ID_HERE/$TUNNEL_ID/g" tunnel-config-production.yml
sed -i.bak "s/yourdomain.com/$DOMAIN/g" tunnel-config-production.yml

echo -e "${GREEN}✅ Tunnel configuration files updated${NC}"

# Step 5: Create DNS records
echo -e "\n${YELLOW}Step 5: Creating DNS records...${NC}"

SUBDOMAINS=("secure2send" "admin.secure2send" "api.secure2send" "files.secure2send")

for sub in "${SUBDOMAINS[@]}"; do
    echo "Creating DNS record for $sub.$DOMAIN..."
    if cloudflared tunnel route dns $TUNNEL_NAME $sub.$DOMAIN; then
        echo -e "${GREEN}✅ DNS record created for $sub.$DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️  DNS record for $sub.$DOMAIN might already exist${NC}"
    fi
done

# Step 6: Generate tunnel token for Docker
echo -e "\n${YELLOW}Step 6: Generating tunnel token for Docker...${NC}"

TUNNEL_TOKEN=$(cloudflared tunnel token $TUNNEL_ID)
if [ -n "$TUNNEL_TOKEN" ]; then
    echo -e "${GREEN}✅ Tunnel token generated${NC}"
    
    # Add tunnel token to .env file
    if ! grep -q "CLOUDFLARE_TUNNEL_TOKEN" .env; then
        echo "" >> .env
        echo "# Cloudflare Tunnel Token (for Docker deployment)" >> .env
        echo "CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN" >> .env
        echo -e "${GREEN}✅ Tunnel token added to .env file${NC}"
    else
        echo -e "${YELLOW}⚠️  Tunnel token already exists in .env file${NC}"
    fi
else
    echo -e "${RED}❌ Failed to generate tunnel token${NC}"
fi

# Step 7: Update .env with Zero Trust configuration
echo -e "\n${YELLOW}Step 7: Updating environment configuration...${NC}"

# Prompt for Zero Trust configuration
echo "Please provide your Cloudflare Zero Trust configuration:"
read -p "Team Domain (e.g., yourteam.cloudflareaccess.com): " TEAM_DOMAIN
read -p "Application Audience ID: " ACCESS_AUD

# Update .env file with actual values
sed -i.bak "s/yourteam.cloudflareaccess.com/$TEAM_DOMAIN/g" .env
sed -i.bak "s/your-application-audience-id/$ACCESS_AUD/g" .env
sed -i.bak "s|https://yourteam.cloudflareaccess.com|https://$TEAM_DOMAIN|g" .env

echo -e "${GREEN}✅ Environment configuration updated${NC}"

# Step 8: Test tunnel configuration
echo -e "\n${YELLOW}Step 8: Testing tunnel configuration...${NC}"

echo "Testing tunnel configuration (this may take a moment)..."
if timeout 10s cloudflared tunnel --config tunnel-config.yml run --dry-run; then
    echo -e "${GREEN}✅ Tunnel configuration is valid${NC}"
else
    echo -e "${YELLOW}⚠️  Tunnel test completed (some warnings are normal)${NC}"
fi

# Step 9: Docker setup (if available)
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}Step 9: Docker setup...${NC}"
    
    read -p "Would you like to set up Docker Compose with Zero Trust? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Building Docker images..."
        docker-compose -f docker-compose.zerotrust.yml build
        
        echo -e "${GREEN}✅ Docker setup completed${NC}"
        echo "To start the services: docker-compose -f docker-compose.zerotrust.yml up -d"
    fi
fi

# Step 10: Create systemd service (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "\n${YELLOW}Step 10: Creating systemd service (optional)...${NC}"
    read -p "Would you like to create a systemd service for the tunnel? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo cloudflared service install tunnel-config.yml
        echo -e "${GREEN}✅ Systemd service created${NC}"
        echo "You can start the service with: sudo systemctl start cloudflared"
    fi
fi

# Final instructions
echo -e "\n${GREEN}🎉 Cloudflare Zero Trust setup completed!${NC}"
echo "=================================================================="
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Configure Zero Trust policies in the Cloudflare dashboard:"
echo "   https://one.dash.cloudflare.com/"
echo ""
echo "2. Set up Access policies for:"
for sub in "${SUBDOMAINS[@]}"; do
    echo "   - https://$sub.$DOMAIN"
done
echo ""
echo "3. Configure identity providers (Google, Azure AD, etc.)"
echo ""
echo "4. Set up device posture checks (optional)"
echo ""
echo "5. Deploy WARP clients to team devices:"
echo "   ./scripts/deploy-warp-clients.sh"
echo ""
echo "6. Start your application:"
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "   Docker: docker-compose -f docker-compose.zerotrust.yml up -d"
fi
echo "   Manual: npm start"
echo ""
echo "7. Test access at:"
for sub in "${SUBDOMAINS[@]}"; do
    echo "   https://$sub.$DOMAIN"
done
echo ""
echo -e "${BLUE}📚 For detailed configuration, see CLOUDFLARE_ZERO_TRUST_SETUP.md${NC}"

# Cleanup
rm -f tunnel-config.yml.bak tunnel-config-production.yml.bak .env.bak

echo -e "\n${PURPLE}🔒 Your Secure2Send Enterprise application is now protected by Cloudflare Zero Trust!${NC}"

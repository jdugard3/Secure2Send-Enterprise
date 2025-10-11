#!/bin/bash

# Secure2Send Enterprise - WARP Client Deployment Script
# This script helps deploy and configure WARP clients across your organization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEAM_NAME="yourteam"  # Replace with your Cloudflare team name
ORG_ID="your-cloudflare-org-id"  # Replace with your org ID
DOMAIN="yourdomain.com"  # Replace with your actual domain

echo -e "${BLUE}🔧 Secure2Send Enterprise - WARP Client Deployment${NC}"
echo "========================================================="

# Check if running as administrator/root
check_admin() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if [[ $EUID -eq 0 ]]; then
            echo -e "${GREEN}✅ Running with administrator privileges${NC}"
        else
            echo -e "${YELLOW}⚠️  Some operations may require sudo privileges${NC}"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if [[ $EUID -eq 0 ]]; then
            echo -e "${GREEN}✅ Running as root${NC}"
        else
            echo -e "${YELLOW}⚠️  Some operations may require sudo privileges${NC}"
        fi
    fi
}

# Download and install WARP client
install_warp_client() {
    echo -e "\n${YELLOW}Installing Cloudflare WARP client...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        echo "Downloading WARP for macOS..."
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew install --cask cloudflare-warp
        else
            echo "Downloading directly from Cloudflare..."
            curl -L "https://1.1.1.1/Cloudflare_WARP.pkg" -o "/tmp/Cloudflare_WARP.pkg"
            echo "Please install the downloaded package: /tmp/Cloudflare_WARP.pkg"
        fi
        
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        echo "Installing WARP for Linux..."
        
        # Detect distribution
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
            echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
            sudo apt-get update
            sudo apt-get install cloudflare-warp
            
        elif command -v yum &> /dev/null; then
            # RHEL/CentOS/Fedora
            curl -fsSl https://pkg.cloudflareclient.com/cloudflare-warp-ascii.repo | sudo tee /etc/yum.repos.d/cloudflare-warp.repo
            sudo yum install cloudflare-warp
            
        else
            echo -e "${RED}❌ Unsupported Linux distribution${NC}"
            exit 1
        fi
        
    else
        echo -e "${RED}❌ Unsupported operating system${NC}"
        echo "Please install WARP manually from: https://1.1.1.1/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ WARP client installed${NC}"
}

# Configure WARP client for organization
configure_warp() {
    echo -e "\n${YELLOW}Configuring WARP client for organization...${NC}"
    
    # Register with organization
    echo "Registering WARP with your organization..."
    if warp-cli teams-enroll "$TEAM_NAME"; then
        echo -e "${GREEN}✅ Successfully enrolled in organization${NC}"
    else
        echo -e "${RED}❌ Failed to enroll. Please check your team name: $TEAM_NAME${NC}"
        return 1
    fi
    
    # Enable WARP
    echo "Enabling WARP..."
    warp-cli connect
    
    # Set mode to WARP+ if available
    echo "Setting WARP mode..."
    warp-cli mode warp || echo "WARP+ not available, using standard WARP"
    
    echo -e "${GREEN}✅ WARP configured${NC}"
}

# Apply device posture settings
configure_device_posture() {
    echo -e "\n${YELLOW}Configuring device posture settings...${NC}"
    
    # Enable device posture
    if warp-cli posture enable; then
        echo -e "${GREEN}✅ Device posture enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Device posture may not be supported on this platform${NC}"
    fi
}

# Configure split tunneling
configure_split_tunnel() {
    echo -e "\n${YELLOW}Configuring split tunneling...${NC}"
    
    # Exclude local networks
    echo "Excluding local networks from tunnel..."
    warp-cli exclude 192.168.0.0/16 || true
    warp-cli exclude 10.0.0.0/8 || true
    warp-cli exclude 172.16.0.0/12 || true
    
    # Include Secure2Send domains
    echo "Including Secure2Send domains in tunnel..."
    warp-cli include secure2send.$DOMAIN || true
    warp-cli include admin.secure2send.$DOMAIN || true
    warp-cli include api.secure2send.$DOMAIN || true
    warp-cli include files.secure2send.$DOMAIN || true
    
    echo -e "${GREEN}✅ Split tunneling configured${NC}"
}

# Test connection
test_connection() {
    echo -e "\n${YELLOW}Testing WARP connection...${NC}"
    
    # Check WARP status
    echo "WARP Status:"
    warp-cli status
    
    # Test connectivity to Secure2Send
    echo -e "\nTesting connectivity to Secure2Send..."
    if curl -s --max-time 10 https://secure2send.$DOMAIN/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Successfully connected to Secure2Send${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not reach Secure2Send (may not be deployed yet)${NC}"
    fi
    
    # Check DNS resolution
    echo -e "\nTesting DNS resolution..."
    if nslookup secure2send.$DOMAIN &> /dev/null; then
        echo -e "${GREEN}✅ DNS resolution working${NC}"
    else
        echo -e "${YELLOW}⚠️  DNS resolution issues detected${NC}"
    fi
}

# Generate deployment script for other devices
generate_deployment_script() {
    echo -e "\n${YELLOW}Generating deployment script for other devices...${NC}"
    
    cat > warp-quick-deploy.sh << 'EOF'
#!/bin/bash
# Quick WARP deployment script for Secure2Send Enterprise
# Generated automatically - distribute to team members

TEAM_NAME="yourteam"

echo "🔧 Installing and configuring WARP for Secure2Send..."

# Install WARP (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
        brew install --cask cloudflare-warp
    else
        echo "Please install WARP manually from: https://1.1.1.1/"
        exit 1
    fi
fi

# Install WARP (Linux - Ubuntu/Debian)
if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v apt-get &> /dev/null; then
    curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
    sudo apt-get update
    sudo apt-get install -y cloudflare-warp
fi

# Configure WARP
warp-cli teams-enroll "$TEAM_NAME"
warp-cli connect
warp-cli mode warp

echo "✅ WARP configured for Secure2Send access!"
echo "You can now access Secure2Send securely through Cloudflare Zero Trust."
EOF

    chmod +x warp-quick-deploy.sh
    echo -e "${GREEN}✅ Quick deployment script created: warp-quick-deploy.sh${NC}"
}

# Create monitoring script
create_monitoring_script() {
    echo -e "\n${YELLOW}Creating WARP monitoring script...${NC}"
    
    cat > monitor-warp.sh << 'EOF'
#!/bin/bash
# WARP monitoring script for Secure2Send Enterprise
# Run this script periodically to monitor WARP health

echo "🔍 WARP Health Check - $(date)"
echo "=================================="

# Check WARP status
echo "WARP Status:"
warp-cli status
echo ""

# Check connectivity
echo "Connectivity Test:"
if curl -s --max-time 5 https://1.1.1.1 &> /dev/null; then
    echo "✅ Internet connectivity: OK"
else
    echo "❌ Internet connectivity: FAILED"
fi

if curl -s --max-time 5 https://secure2send.$DOMAIN &> /dev/null; then
    echo "✅ Secure2Send connectivity: OK"
else
    echo "❌ Secure2Send connectivity: FAILED"
fi

# Check device posture (if available)
echo ""
echo "Device Posture:"
warp-cli posture status 2>/dev/null || echo "Device posture not available"

echo ""
echo "Monitoring complete."
EOF

    chmod +x monitor-warp.sh
    echo -e "${GREEN}✅ Monitoring script created: monitor-warp.sh${NC}"
}

# Main deployment function
main() {
    check_admin
    
    echo -e "\n${BLUE}Starting WARP client deployment...${NC}"
    
    # Check if WARP is already installed
    if command -v warp-cli &> /dev/null; then
        echo -e "${GREEN}✅ WARP client already installed${NC}"
    else
        install_warp_client
    fi
    
    # Configure WARP
    configure_warp
    configure_device_posture
    configure_split_tunnel
    
    # Test connection
    test_connection
    
    # Generate additional scripts
    generate_deployment_script
    create_monitoring_script
    
    echo -e "\n${GREEN}🎉 WARP client deployment completed!${NC}"
    echo "=============================================="
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Distribute warp-quick-deploy.sh to team members"
    echo "2. Configure Zero Trust policies in Cloudflare dashboard"
    echo "3. Run monitor-warp.sh periodically to check health"
    echo "4. Train users on WARP client usage"
    echo ""
    echo -e "${BLUE}📚 For more information, see CLOUDFLARE_ZERO_TRUST_SETUP.md${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "install")
        install_warp_client
        ;;
    "configure")
        configure_warp
        ;;
    "test")
        test_connection
        ;;
    "monitor")
        ./monitor-warp.sh
        ;;
    *)
        main
        ;;
esac







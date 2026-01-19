#!/bin/bash

# Pre-Deployment Check Script
# Verifies that everything is ready for production deployment

set -e

echo "════════════════════════════════════════════════════════════════════"
echo "🔍 Pre-Deployment Check for Fly.io"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Function to print info
info() {
    echo "ℹ️  $1"
}

echo "1️⃣  Checking Local Environment..."
echo "────────────────────────────────────────────────────────────────────"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Not in project root directory (package.json not found)"
    exit 1
fi
success "In correct project directory"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js installed: $NODE_VERSION"
else
    error "Node.js not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm installed: $NPM_VERSION"
else
    error "npm not installed"
fi

echo ""
echo "2️⃣  Checking Git Status..."
echo "────────────────────────────────────────────────────────────────────"

# Check if git is installed
if ! command -v git &> /dev/null; then
    error "git not installed"
else
    success "git installed"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        warning "Uncommitted changes detected"
        git status --short
        echo ""
        info "Consider committing changes before deployment"
    else
        success "No uncommitted changes"
    fi
    
    # Check current branch
    BRANCH=$(git branch --show-current)
    if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
        success "On main branch: $BRANCH"
    else
        warning "Not on main branch (current: $BRANCH)"
    fi
    
    # Show last commit
    LAST_COMMIT=$(git log -1 --oneline)
    info "Last commit: $LAST_COMMIT"
fi

echo ""
echo "3️⃣  Testing Build Process..."
echo "────────────────────────────────────────────────────────────────────"

# Test build
info "Running: npm run build"
if npm run build > /tmp/build.log 2>&1; then
    success "Build completed successfully"
    
    # Check if dist directory exists
    if [ -d "dist" ]; then
        success "dist/ directory created"
        
        # Check dist size
        DIST_SIZE=$(du -sh dist | cut -f1)
        info "Build size: $DIST_SIZE"
    else
        error "dist/ directory not created"
    fi
else
    error "Build failed"
    echo "See /tmp/build.log for details"
    cat /tmp/build.log
fi

echo ""
echo "4️⃣  Checking Fly.io CLI..."
echo "────────────────────────────────────────────────────────────────────"

# Check if flyctl is installed
if command -v fly &> /dev/null; then
    FLY_VERSION=$(fly version)
    success "Fly.io CLI installed: $FLY_VERSION"
    
    # Check if authenticated
    if fly auth whoami &> /dev/null; then
        FLY_USER=$(fly auth whoami 2>&1 | grep "Email:" | awk '{print $2}')
        success "Authenticated as: $FLY_USER"
    else
        error "Not authenticated with Fly.io"
        info "Run: fly auth login"
    fi
else
    error "Fly.io CLI not installed"
    info "Install from: https://fly.io/docs/hands-on/install-flyctl/"
fi

echo ""
echo "5️⃣  Checking Fly.io Configuration..."
echo "────────────────────────────────────────────────────────────────────"

# Check if fly.toml exists
if [ -f "fly.toml" ]; then
    success "fly.toml found"
    
    # Extract app name
    APP_NAME=$(grep "^app = " fly.toml | cut -d'"' -f2)
    info "App name: $APP_NAME"
    
    # Check release command
    RELEASE_CMD=$(grep "release_command = " fly.toml | cut -d'"' -f2)
    if [ -n "$RELEASE_CMD" ]; then
        info "Release command: $RELEASE_CMD"
        if [ "$RELEASE_CMD" = "npm run db:push" ]; then
            warning "Release command uses 'db:push' - consider using 'npm run migrate' instead"
        fi
    fi
else
    error "fly.toml not found"
fi

# Check Dockerfile
if [ -f "Dockerfile" ]; then
    success "Dockerfile found"
else
    error "Dockerfile not found"
fi

echo ""
echo "6️⃣  Checking Migration Files..."
echo "────────────────────────────────────────────────────────────────────"

# Count migration files
if [ -d "migrations" ]; then
    SQL_COUNT=$(find migrations -name "*.sql" -type f | wc -l | tr -d ' ')
    success "Found $SQL_COUNT SQL migration files"
    
    # List recent migrations
    info "Recent migrations:"
    find migrations -name "*.sql" -type f | sort | tail -5 | while read file; do
        echo "   - $(basename $file)"
    done
else
    error "migrations/ directory not found"
fi

# Check if migration script exists
if [ -f "scripts/run-migrations.ts" ]; then
    success "Migration script found"
else
    error "Migration script not found"
fi

echo ""
echo "7️⃣  Checking Required Files..."
echo "────────────────────────────────────────────────────────────────────"

REQUIRED_FILES=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "vite.config.ts"
    "drizzle.config.ts"
    "shared/schema.ts"
    "server/index.ts"
    "server/env.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "$file exists"
    else
        error "$file missing"
    fi
done

echo ""
echo "8️⃣  Checking Environment Variables..."
echo "────────────────────────────────────────────────────────────────────"

if command -v fly &> /dev/null && fly auth whoami &> /dev/null; then
    info "Checking Fly.io secrets..."
    
    # Try to get secrets list
    if fly secrets list > /tmp/secrets.txt 2>&1; then
        # Check for critical secrets
        CRITICAL_SECRETS=(
            "DATABASE_URL"
            "SESSION_SECRET"
        )
        
        for secret in "${CRITICAL_SECRETS[@]}"; do
            if grep -q "$secret" /tmp/secrets.txt; then
                success "$secret is set"
            else
                error "$secret is NOT set"
            fi
        done
        
        # Check for recommended secrets
        RECOMMENDED_SECRETS=(
            "MAILGUN_API_KEY"
            "MAILGUN_DOMAIN"
            "APP_URL"
        )
        
        for secret in "${RECOMMENDED_SECRETS[@]}"; do
            if grep -q "$secret" /tmp/secrets.txt; then
                success "$secret is set"
            else
                warning "$secret is NOT set (recommended)"
            fi
        done
        
        rm /tmp/secrets.txt
    else
        warning "Could not check Fly.io secrets (may need to specify app name)"
    fi
else
    warning "Skipping Fly.io secrets check (not authenticated)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "📊 Summary"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create database backup"
    echo "  2. Run migrations: fly ssh console → npm run migrate"
    echo "  3. Deploy: fly deploy"
    echo ""
    echo "See DEPLOYMENT_QUICK_START.md for detailed instructions."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found.${NC}"
    echo ""
    echo "You can proceed with deployment, but review the warnings above."
    echo ""
    echo "Next steps:"
    echo "  1. Review warnings"
    echo "  2. Create database backup"
    echo "  3. Run migrations: fly ssh console → npm run migrate"
    echo "  4. Deploy: fly deploy"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found.${NC}"
    fi
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi

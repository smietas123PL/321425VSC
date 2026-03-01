#!/bin/bash
# AgentSpark Quick Deploy Script

set -e

echo "⚡ AgentSpark Deployment Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Warning: git not found. Install git first.${NC}"
    exit 1
fi

echo -e "${BLUE}Choose deployment option:${NC}"
echo "1) GitHub Pages"
echo "2) Netlify"
echo "3) Vercel"
echo "4) Local development server"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        echo -e "${GREEN}Deploying to GitHub Pages...${NC}"
        
        # Check if in git repo
        if [ ! -d .git ]; then
            echo "Initializing git repository..."
            git init
            git add .
            git commit -m "Initial commit: AgentSpark v1.0.0"
        fi
        
        echo ""
        echo "Next steps:"
        echo "1. Create a repository on GitHub"
        echo "2. Run: git remote add origin https://github.com/yourusername/agentspark.git"
        echo "3. Run: git push -u origin main"
        echo "4. Go to repo Settings → Pages"
        echo "5. Set source to 'Deploy from branch: main'"
        echo ""
        echo "Your site will be at: https://yourusername.github.io/agentspark"
        ;;
        
    2)
        echo -e "${GREEN}Deploying to Netlify...${NC}"
        
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "Logging into Netlify..."
        netlify login
        
        echo "Deploying..."
        netlify deploy --prod
        
        echo -e "${GREEN}✓ Deployed!${NC}"
        ;;
        
    3)
        echo -e "${GREEN}Deploying to Vercel...${NC}"
        
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "Deploying..."
        vercel --prod
        
        echo -e "${GREEN}✓ Deployed!${NC}"
        ;;
        
    4)
        echo -e "${GREEN}Starting local development server...${NC}"
        
        # Check for Python
        if command -v python3 &> /dev/null; then
            echo "Starting Python HTTP server on port 8000..."
            echo "Open http://localhost:8000 in your browser"
            python3 -m http.server 8000
        elif command -v python &> /dev/null; then
            echo "Starting Python HTTP server on port 8000..."
            echo "Open http://localhost:8000 in your browser"
            python -m http.server 8000
        else
            echo -e "${YELLOW}Python not found. Install Python or use:${NC}"
            echo "  npx serve"
            echo "  php -S localhost:8000"
        fi
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Done!${NC}"
echo ""
echo "Next steps:"
echo "- Test your deployment"
echo "- Share on Twitter/Reddit"
echo "- Add custom templates"
echo "- Check docs/LAUNCH_PLAN.md for marketing tips"
echo ""
echo "Need help? https://github.com/yourusername/agentspark/issues"

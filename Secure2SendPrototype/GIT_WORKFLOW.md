# Git Workflow Guide

## Overview

This document outlines the Git workflow and best practices for the Secure2Send Enterprise project.

## Branch Structure

- **main**: Production-ready code
- **develop**: Development branch for integrating features  
- **feature/***: Individual feature branches
- **hotfix/***: Emergency fixes for production

## Commit Message Convention

We use conventional commits for clear, standardized commit messages:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```
feat(auth): implement session timeout handling
fix(ui): resolve merchant application form validation errors
docs(api): add IRIS CRM integration documentation
```

## Development Workflow

### 1. Starting a New Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Making Changes
```bash
# Make your changes
git add .
git commit -m "feat(scope): description of changes"
```

### 3. Preparing for Review
```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main  # Rebase onto latest main
git push origin feature/your-feature-name
```

### 4. After Code Review
```bash
git checkout main
git pull origin main
git merge --no-ff feature/your-feature-name
git push origin main
git branch -d feature/your-feature-name
```

## Current Repository Status

### Recent Major Changes (Latest Commits)

1. **Session Timeout Fix**: Resolved 3-5 minute authentication timeout issues
2. **IRIS CRM Server Integration**: Complete backend integration with field mappings
3. **Enhanced UI Components**: Comprehensive merchant application form with all IRIS fields
4. **Zod Schema Expansion**: Full validation for all new IRIS CRM fields
5. **Database Migration**: Added 005_add_iris_fields.sql with all required columns

### Files Changed in Latest Release
- Database schema and migrations
- Zod validation schemas
- React components (BusinessInformationStep, RepresentativesContactsStep, etc.)
- Server-side IRIS integration
- Authentication improvements
- UI/UX enhancements

## Best Practices

### Before Committing
1. Run `npm run lint` to check code style
2. Run `npm run test` if tests exist
3. Review your changes: `git diff --staged`
4. Use meaningful commit messages

### File Organization
- Keep commits focused on a single feature/fix
- Don't commit configuration files with sensitive data
- Use `.gitignore` to exclude build artifacts and dependencies

### Security
- Never commit `.env` files or sensitive credentials
- Review code changes before pushing to remote
- Use environment variables for configuration

## Troubleshooting

### Common Issues

**Merge Conflicts**
```bash
git status  # See which files have conflicts
# Edit files to resolve conflicts
git add <resolved-files>
git commit
```

**Undoing Changes**
```bash
git restore <file>          # Discard working directory changes
git restore --staged <file> # Unstage changes
git reset HEAD~1           # Undo last commit (keep changes)
git reset --hard HEAD~1    # Undo last commit (discard changes)
```

**Viewing History**
```bash
git log --oneline -10      # Show last 10 commits
git show <commit-hash>     # Show specific commit details
git diff <commit1> <commit2>  # Compare commits
```

## Automated Processes

Currently configured:
- `.gitignore` excludes common files (node_modules, .env, uploads, etc.)
- `.gitattributes` handles line endings and file types

## Future Enhancements

Consider implementing:
- GitHub Actions for CI/CD
- Pre-commit hooks for code quality
- Automated testing on pull requests
- Branch protection rules

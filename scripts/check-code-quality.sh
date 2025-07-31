#!/bin/bash

# Code Quality Check Script
# Run this before committing to catch issues early

set -e

echo "🔍 Running code quality checks..."

# Run tests
echo "🧪 Running tests..."
python -m pytest backend/tests/ -v --tb=short

# Run backend-specific checks
echo "🐍 Running backend checks..."
cd backend
ruff check .
ruff format --check .
cd ..

echo "✅ All checks passed! Ready to commit."
echo ""
echo "💡 Tip: Use 'git commit' (without --no-verify) to automatically run these checks."

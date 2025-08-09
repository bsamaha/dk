#!/bin/bash

# Code Quality Check Script (tests-only inside pre-commit)
# Pre-commit already runs ruff/isort/bandit/format; duplicating can cause
# version drift and false failures. Keep this to tests for stability.

set -euo pipefail

echo "🔍 Running code quality checks..."

echo "🧪 Running tests..."
python -m pytest backend/tests/ -q

echo "✅ All checks passed!"

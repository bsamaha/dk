# Pre-commit Hook Setup Guide

This document describes the comprehensive pre-commit hook structure implemented for the Fantasy Draft Analytics project.

## Overview

The pre-commit hooks are designed to maintain code quality, security, and consistency across the entire project while adhering to the lean stack principle. They provide fast feedback and automatic fixes where possible.

## Hook Categories

### 1. General File Checks

- **Trailing whitespace removal**: Cleans up unnecessary whitespace
- **End-of-file fixer**: Ensures files end with a newline
- **File format validation**: Checks YAML, TOML, and JSON syntax
- **Large file prevention**: Prevents files > 1MB from being committed
- **Merge conflict detection**: Catches unresolved merge conflicts
- **Line ending normalization**: Ensures consistent LF line endings

### 2. Python Backend Hooks

- **Black formatting**: Auto-formats Python code (removed `--check` to allow fixing)
- **isort**: Sorts imports with Black profile compatibility
- **Ruff linting**: Fast Python linter with auto-fix capabilities
- **Ruff formatting**: Additional formatting rules
- **Bandit security scanner**: Detects common security issues

### 3. Frontend Hooks

- **ESLint**: TypeScript/JavaScript linting
- **Prettier**: Code formatting for TS/JS/JSON/CSS/MD files
- **TypeScript checking**: Validates TypeScript without emitting files
- **Package.json formatting**: Keeps package.json sorted and formatted

### 4. Documentation Hooks

- **Markdownlint**: Ensures consistent markdown formatting in docs
- **Conventional commits**: Enforces conventional commit message format

### 5. Security Hooks

- **Secrets detection**: Prevents accidental commit of sensitive information

## Installation

### Prerequisites

- Python 3.12+
- Node.js 20+
- pnpm 8+
- Git repository

### Steps

1. **Install pre-commit**:

   ```bash
   pip install pre-commit
   ```

2. **Install additional dependencies**:

   ```bash
   # For Python security scanning
   pip install bandit

   # For secrets detection
   pip install detect-secrets

   # For markdown linting (requires Node.js)
   npm install -g markdownlint-cli
   ```

3. **Install frontend dependencies**:

   ```bash
   cd frontend
   pnpm install
   ```

4. **Install pre-commit hooks**:

   ```bash
   pre-commit install
   pre-commit install --hook-type commit-msg
   ```

5. **Initial run** (optional but recommended):

   ```bash
   pre-commit run --all-files
   ```

## Configuration Files

The setup includes several configuration files:

### `.pre-commit-config.yaml`

Main configuration file defining all hooks and their settings.

### `frontend/.prettierrc`

Prettier configuration for consistent code formatting:

- Single quotes
- 2-space indentation
- Trailing commas (ES5)
- 80-character line length

### `.markdownlint.yaml`

Markdown linting rules:

- 120-character line length for docs
- Allows inline HTML for documentation
- Consistent code block styles

### `.secrets.baseline`

Baseline file for detect-secrets to prevent false positives.

## Usage

### Automatic Execution

Pre-commit hooks run automatically on:

- `git commit` (most hooks)
- `git commit -m "message"` (commit message hooks)

### Manual Execution

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black

# Run hooks on specific files
pre-commit run --files backend/app/main.py

# Skip hooks for emergency commits
git commit --no-verify -m "emergency fix"
```

### Frontend-Specific Commands

```bash
cd frontend

# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

## Troubleshooting

### Common Issues

1. **Pre-commit not found**: Ensure pre-commit is installed and in PATH
2. **Node.js hooks failing**: Ensure Node.js 20+ and pnpm 8+ are installed
   - On Windows: Frontend hooks may be disabled due to PATH issues
   - Run manually: `cd frontend && pnpm run lint && pnpm run format`
3. **Secrets detection failing**: Lock files (pnpm-lock.yaml) are excluded from scanning
4. **Markdown linting failing**: Install markdownlint-cli globally: `npm install -g markdownlint-cli`
5. **TypeScript config errors**: Remove invalid compiler options like `erasableSyntaxOnly`
6. **Bandit errors**: Ensure bandit is scanning directory, not individual files
7. **Executable permissions**: Run `chmod +x scripts/deploy.sh` on Unix systems

### Bypass Hooks (Emergency)

```bash
# Skip all hooks
git commit --no-verify -m "emergency commit"

# Skip specific hook
SKIP=black git commit -m "commit message"

# Skip multiple hooks
SKIP=black,ruff git commit -m "commit message"
```

### Update Hooks

```bash
# Update to latest versions
pre-commit autoupdate

# Clean cache if issues persist
pre-commit clean
```

## Integration with CI/CD

The pre-commit hooks are designed to match the CI/CD pipeline:

- **Backend**: Matches `ruff check` and `black --check` in CI
- **Frontend**: Matches `pnpm run lint` and `pnpm run test` in CI
- **Types**: Complements mypy type checking in CI

## Performance Considerations

### Optimization Features

- **File filtering**: Hooks only run on relevant files
- **Caching**: Pre-commit caches environments between runs
- **Parallel execution**: Multiple hooks run concurrently
- **Incremental**: Only processes changed files by default

### Expected Performance

- **Full repository scan**: 30-60 seconds (first run)
- **Incremental commits**: 5-15 seconds
- **Frontend hooks**: 10-20 seconds (includes pnpm install)

## Security Considerations

### Secrets Detection

- Scans for API keys, passwords, tokens
- Uses baseline file to ignore false positives
- Regularly update baseline: `detect-secrets scan --baseline .secrets.baseline`

### Dependency Security

- Bandit scans Python code for security issues
- Consider adding `safety` or `pip-audit` for dependency vulnerabilities
- Frontend dependencies checked by npm audit during CI

## Customization

### Adding New Hooks

1. Edit `.pre-commit-config.yaml`
2. Add new repo or hook configuration
3. Run `pre-commit install` to update
4. Test with `pre-commit run --all-files`

### Disabling Hooks

```yaml
# In .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black
        stages: [manual]  # Only run manually
```

### Custom Hooks

```yaml
# Local custom hook example
- repo: local
  hooks:
    - id: custom-check
      name: Custom validation
      entry: python scripts/custom_check.py
      language: system
      pass_filenames: false
```

## Best Practices

1. **Run hooks before pushing**: `pre-commit run --all-files`
2. **Keep hooks fast**: Avoid long-running processes
3. **Auto-fix when possible**: Use `--fix` flags instead of `--check`
4. **Regular updates**: Run `pre-commit autoupdate` monthly
5. **Team alignment**: Ensure all team members use same hook versions

## Lean Stack Compliance

This pre-commit setup follows the project's lean stack principle:

- **Minimal dependencies**: Only essential tools
- **Fast execution**: Optimized for development speed
- **Local development**: All tools work offline
- **Single container**: No external services required
- **Resource efficient**: Designed for low-resource environments

## Monitoring and Metrics

### Hook Performance

```bash
# Time hook execution
time pre-commit run --all-files

# Profile specific hook
pre-commit run --verbose black
```

### Success Metrics

- Reduced CI failures due to linting/formatting
- Faster code review process
- Consistent code style across team
- Early detection of security issues

---

*Last updated: 2024-01-15*
*For issues or suggestions, see: [GitHub Issues](https://github.com/your-org/your-repo/issues)*

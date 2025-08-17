# Fantasy Football Analytics Dashboard

A modern React + TypeScript frontend with FastAPI backend for analyzing fantasy football draft data.

## 🚀 Quick Start

### Windows

```bash
# Double-click or run in command prompt
start-dev.bat
```

### Mac/Linux

```bash
# Make executable and run
chmod +x start-dev.sh
./start-dev.sh
```

This will automatically:

- Create Python virtual environment (if needed)
- Install backend dependencies
- Install frontend dependencies (if needed)
- Start both servers concurrently

## 📱 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠 Manual Setup

### Backend (FastAPI)

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# Install dependencies
cd backend
pip install -r requirements.txt

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗 Project Structure

```text
dk/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app
│   └── requirements.txt
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   ├── types/       # TypeScript types
│   │   └── main.tsx
│   └── package.json
├── data/               # Data files
└── start-dev.*         # Startup scripts
```

## 🎯 Features

- **Overview Dashboard**: Key metrics and charts
- **Player Analysis**: Searchable player list with pagination
- **Position Analysis**: Position-based statistics and visualizations
- **Player Combinations**: Multi-player roster combination search
- **Responsive Design**: Works on desktop and mobile
- **Real-time Data**: Live backend integration

## 🔧 Tech Stack

### Frontend

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + Mantine UI
- TanStack Query (API state)
- Zustand (global state)
- Recharts (data visualization)

### Backend

- FastAPI
- Polars (data processing)
- Pydantic (data validation)
- Uvicorn (ASGI server)

## 📊 Data

The application analyzes fantasy football draft data from a Parquet file (`data/updated_bestball_data.parquet`). The data includes:

- Player names and positions
- Draft rounds and positions
- Team compositions
- Draft metadata

## 🐛 Troubleshooting

### Container healthcheck host header

The container healthcheck in the `Dockerfile` sends a `Host` header to satisfy FastAPI's `TrustedHostMiddleware`.
Override the host used during healthchecks by setting the `ALLOWED_HOST_HEALTHCHECK` environment variable (defaults to `thesignalcallers.com`).

Examples:

```bash
# Run container with custom Host header for healthcheck
docker run -e ALLOWED_HOST_HEALTHCHECK=mydomain.example ...
```

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - ALLOWED_HOST_HEALTHCHECK=mydomain.example
```

### Port Already in Use

If you get port conflicts, kill existing processes:

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

### Dependencies Issues

```bash
# Backend - update pip and reinstall
pip install --upgrade pip
pip install -r backend/requirements.txt --force-reinstall

# Frontend - clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Data File Missing

Ensure `data/updated_bestball_data.parquet` exists in the project root.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## 📄 License

This project is for educational and analytical purposes.

## Development Workflow

### Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality. **Never skip these checks!**

#### Setup (first time only)

```bash
# Install pre-commit hooks
pre-commit install
```

#### Development Workflow

```bash
# 1. Make your changes
# 2. Stage your changes
git add .

# 3. Commit (pre-commit hooks will run automatically)
git commit -m "your commit message"

# If pre-commit hooks fail, fix the issues and commit again
# DO NOT use --no-verify or -n flags!
```

#### Manual Pre-commit Check

```bash
# Run all pre-commit hooks manually
pre-commit run --all-files

# Run only on staged files
pre-commit run
```

#### What the hooks check

- ✅ Code formatting (ruff-format)
- ✅ Linting (ruff)
- ✅ Import sorting (isort)
- ✅ Security (bandit)
- ✅ Frontend linting and tests
- ✅ Documentation formatting
- ✅ Secret detection

**⚠️ Never use `git commit --no-verify` or `git commit -n` - this skips all quality checks!**

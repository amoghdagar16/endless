# GitHub Upload Guide

## ✅ Files TO Upload (Commit to GitHub)

### Backend
- `backend/app/` - All application code
- `backend/alembic.ini` - Database migration config
- `backend/pyproject.toml` - Python dependencies
- `backend/Dockerfile` - Docker configuration
- `backend/.gitignore` - Backend ignore rules

### Frontend
- `frontend/app/` - Next.js pages and components
- `frontend/components/` - React components
- `frontend/lib/` - Utility functions and API clients
- `frontend/types/` - TypeScript type definitions
- `frontend/public/` - Static assets
- `frontend/package.json` - Node dependencies
- `frontend/tsconfig.json` - TypeScript config
- `frontend/tailwind.config.ts` - Tailwind CSS config
- `frontend/next.config.mjs` - Next.js config

### Root Level
- `docker-compose.yml` - Docker setup
- `README.md` - Project documentation
- `.gitignore` - Git ignore rules
- Documentation files (*.md)
- Sample/template CSV files (without real data)

## ❌ Files NOT to Upload (Will be ignored)

### Never Commit
- `.env` files - Contains secrets, API keys, passwords
- `*.db`, `*.sqlite` - Database files with potentially sensitive data
- `.venv/`, `venv/` - Virtual environment (too large, should be recreated)
- `node_modules/` - Node packages (too large, install via npm)
- `__pycache__/`, `*.pyc` - Python cache files
- `.DS_Store` - Mac OS system files
- `logs/` - Log files
- `.next/` - Next.js build output

### Sensitive Data
- `receipts.db` - Your actual database
- Any files with real financial data
- API keys, tokens, passwords
- SSL certificates (*.pem, *.key)

## 📝 Before First Push

1. **Create `.env.example` files** (without real values):
   ```bash
   # backend/.env.example
   DATABASE_URL=postgresql://user:pass@localhost/dbname
   SECRET_KEY=your-secret-key-here
   
   # frontend/.env.example
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_COMPANY_ID=00000000-0000-0000-0000-000000000001
   ```

2. **Review all files** for sensitive data:
   - Check CSV files for real account data
   - Check any hardcoded credentials
   - Verify no API keys in code

3. **Test the `.gitignore`**:
   ```bash
   git status
   # Should NOT show: .venv, node_modules, *.db, .env, etc.
   ```

## 🚀 Recommended First Commit

```bash
# Initialize git (if not done)
cd /Users/atimanr/AI_accounting/v21.1
git init

# Add all files (gitignore will filter)
git add .

# Check what will be committed
git status

# First commit
git commit -m "Initial commit: AI Accounting System v21.1

- FastAPI backend with PostgreSQL
- Next.js frontend with TypeScript
- Chart of Accounts management
- OCR document parsing
- Account CRUD operations"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 📦 What Users Will Need to Setup

After cloning your repo, users will need to:

1. Install Python dependencies:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -e .
   ```

2. Install Node dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Create their own `.env` files based on `.env.example`

4. Run database migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

5. Start services (via docker-compose or manually)

## 🔒 Security Checklist

- [ ] No `.env` files committed
- [ ] No database files committed
- [ ] No API keys or passwords in code
- [ ] `.gitignore` is comprehensive
- [ ] `.env.example` files created
- [ ] README has setup instructions
- [ ] All secrets are environment variables

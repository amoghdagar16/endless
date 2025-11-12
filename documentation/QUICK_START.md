# Quick Start Guide - AI Accounting System

## 🚀 How to Run This App

Follow these steps to start both the backend and frontend servers:

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
# Navigate to the backend directory
cd /Users/atimanr/AI_accounting/v21.1/backend

# Activate Python virtual environment
source ../.venv/bin/activate

# Start the FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

✅ Backend is now running at **http://127.0.0.1:8000**

---

### Step 2: Start the Frontend Server

Open a **NEW terminal** (keep the backend running) and run:

```bash
# Navigate to the frontend directory
cd /Users/atimanr/AI_accounting/v21.1/frontend

# Add Homebrew to PATH (required for Node.js)
export PATH="/opt/homebrew/bin:$PATH"

# Start the Next.js development server
npm run dev
```

You should see:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.9s
```

✅ Frontend is now running at **http://localhost:3000**

---

### Step 3: Open the App in Your Browser

Open your web browser and go to:

### 🌐 **http://localhost:3000**

---

## 📱 What You'll See

### Dashboard (Home Page)
- **Account Statistics**: Total accounts, assets, liabilities, equity, income, expense
- **Quick Action Cards**: Links to Chart of Accounts, Document Scanner, Journal Entries

### Chart of Accounts (`/accounts`)
- **View all 140 accounts** from your database
- **Toggle views**: Switch between Table View and Tree View
- **Search**: Find accounts by number or name
- **Filter**: Filter by account type (asset, liability, equity, income, expense)
- **Import**: Upload CSV file to import new accounts
- **Export**: Download all accounts as CSV

### Documents (`/documents`)
- OCR document scanning functionality

### Journals (`/journals`)
- Coming soon placeholder

---

## 🎯 Quick Test

To verify everything is working:

1. **Go to http://localhost:3000** - You should see the Dashboard
2. **Click "View Chart of Accounts"** - You should see 140 accounts in a table
3. **Toggle to "Tree View"** - You should see the hierarchical account structure
4. **Use the search box** - Try searching for "Cash" or "1000"
5. **Filter by type** - Select "asset" from the dropdown
6. **Click "Export CSV"** - A CSV file should download

---

## 🛑 How to Stop the Servers

### Stop Backend:
Press `Ctrl+C` in the backend terminal

### Stop Frontend:
Press `Ctrl+C` in the frontend terminal

---

## 🔄 Restart Everything

If you need to restart both servers:

```bash
# Terminal 1: Backend
cd /Users/atimanr/AI_accounting/v21.1/backend
source ../.venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend (in a separate terminal)
cd /Users/atimanr/AI_accounting/v21.1/frontend
export PATH="/opt/homebrew/bin:$PATH"
npm run dev
```

---

## ❓ Troubleshooting

### Backend won't start?
- Make sure Python virtual environment is activated: `source ../.venv/bin/activate`
- Check if port 8000 is already in use: `lsof -i :8000`
- Check database connection in `backend/.env`

### Frontend won't start?
- Make sure Node.js is in PATH: `export PATH="/opt/homebrew/bin:$PATH"`
- Verify Node.js is installed: `node --version` (should show v25.1.0)
- Make sure dependencies are installed: `npm install`

### Can't see accounts on the frontend?
- Make sure backend is running on port 8000
- Check browser console for errors (F12 → Console tab)
- Verify `.env.local` has correct API URL: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

### "Company-Id header is required" error?
- This is normal for direct API calls
- The frontend automatically adds this header
- For manual API testing with curl, use: `curl -H "X-Company-Id: 00000000-0000-0000-0000-000000000001" http://127.0.0.1:8000/v1/accounts`

---

## 📚 Additional Resources

- **Backend API Documentation**: http://127.0.0.1:8000/docs (when backend is running)
- **Frontend Setup Guide**: `frontend/SETUP_GUIDE.md`
- **Technical Documentation**: `frontend/FRONTEND_SUMMARY.md`
- **Database Access**: Use `./view_db.sh` to query the database

---

## 🎉 You're All Set!

Your AI Accounting System is now running and ready to use. Enjoy exploring the features!

**Dashboard**: http://localhost:3000  
**API Docs**: http://127.0.0.1:8000/docs  
**Chart of Accounts**: http://localhost:3000/accounts

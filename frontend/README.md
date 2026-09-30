# Pramana

Pramana is a zero-trust digital-access verification prototype.

The prototype checks a wallet-format identity, evaluates a request based on the requested asset, purpose, and duration, creates a short-lived JWT session, and records approval or denial events in an audit log.

## Features

- React.js user interface
- FastAPI backend
- SQLite audit database for prototype mode
- PostgreSQL-ready configuration
- JWT-based temporary session
- Ethereum/Polygon wallet address-format verification through Web3.py
- DID / Polygon ID reference field
- Access approval and denial rules
- Audit log dashboard
- Future roadmap for Polygon, Solidity, IPFS, and AES-256-GCM encrypted storage

## Project Structure

```text
pramana/
├── backend/
└── frontend/
```

## Run Backend

```bash
cd backend
python -m venv venv
```

Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

Install and run:

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Open API documentation:

```text
http://127.0.0.1:8000/docs
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Security Note

Do not upload `.env` files, passwords, API keys, wallet private keys, seed phrases, local databases, or real identity/evidence data to GitHub.
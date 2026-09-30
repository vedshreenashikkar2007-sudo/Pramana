# Pramana

Pramana is a zero-trust digital-access prototype.

It verifies an Ethereum/Polygon wallet-format identity, checks an access request based on asset, purpose, and duration, issues a short-lived JWT session, and records approvals or denials in an audit log.

## Technology Stack

- React.js
- FastAPI
- SQLite for the prototype database
- PostgreSQL-ready configuration
- JWT
- Web3.py
- DID, Polygon ID, Polygon, Solidity, IPFS, and AES-256-GCM roadmap

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

Then run:

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Open:

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

## Security

Do not upload `.env` files, wallet private keys, seed phrases, database passwords, or API keys.
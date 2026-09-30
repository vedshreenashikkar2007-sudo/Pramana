import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from web3 import Web3

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pramana.db")
JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "pramana-demo-secret-change-this-before-production",
)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(
    title="Pramana API",
    description="Zero-trust access verification prototype",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AccessRequestRecord(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(100), nullable=False, index=True)
    did = Column(String(255), nullable=True)
    asset_name = Column(String(120), nullable=False)
    purpose = Column(Text, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    decision = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    ipfs_cid = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


Base.metadata.create_all(bind=engine)


class WalletLoginRequest(BaseModel):
    wallet_address: str
    did: Optional[str] = None


class AccessRequestInput(BaseModel):
    wallet_address: str
    did: Optional[str] = None
    asset_name: str
    purpose: str
    duration_minutes: int = Field(..., ge=1, le=240)
    ipfs_cid: Optional[str] = None


DEMO_ASSETS = {
    "Forensic Evidence Vault",
    "Case File Alpha",
    "Secure Medical Record",
    "Confidential Design Document",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(wallet_address: str, did: Optional[str] = None):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": wallet_address,
        "did": did or "",
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_wallet_address(wallet_address: str) -> bool:
    return Web3.is_address(wallet_address)


def get_current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Bearer token is required. Verify the wallet first.",
        )

    token = authorization.replace("Bearer ", "", 1)

    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="JWT has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid JWT.")


def evaluate_access(request: AccessRequestInput):
    if not verify_wallet_address(request.wallet_address):
        return False, "Denied: invalid Ethereum or Polygon wallet address."

    if request.asset_name not in DEMO_ASSETS:
        return False, "Denied: asset is not in the approved demo list."

    if len(request.purpose.strip()) < 5:
        return False, "Denied: provide a meaningful access purpose."

    if not 5 <= request.duration_minutes <= 120:
        return False, "Denied: access duration must be between 5 and 120 minutes."

    return True, "Approved: identity, asset, purpose, and time rules passed."


@app.get("/")
def root():
    return {
        "project": "Pramana",
        "message": "Zero-trust access verification prototype is running.",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
    }


@app.get("/assets")
def get_assets():
    return {
        "assets": sorted(DEMO_ASSETS),
    }


@app.post("/auth/wallet-login")
def wallet_login(payload: WalletLoginRequest):
    if not verify_wallet_address(payload.wallet_address):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid Ethereum or Polygon wallet address.",
        )

    token = create_token(payload.wallet_address, payload.did)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in_minutes": JWT_EXPIRE_MINUTES,
    }


@app.post("/access/request")
def request_access(
    request: AccessRequestInput,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user["sub"].lower() != request.wallet_address.lower():
        raise HTTPException(
            status_code=403,
            detail="JWT wallet address does not match the access request wallet.",
        )

    allowed, reason = evaluate_access(request)
    decision = "APPROVED" if allowed else "DENIED"

    record = AccessRequestRecord(
        wallet_address=request.wallet_address,
        did=request.did,
        asset_name=request.asset_name,
        purpose=request.purpose,
        duration_minutes=request.duration_minutes,
        decision=decision,
        reason=reason,
        ipfs_cid=request.ipfs_cid,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    response = {
        "request_id": record.id,
        "decision": decision,
        "reason": reason,
        "wallet_address": record.wallet_address,
        "asset_name": record.asset_name,
        "duration_minutes": record.duration_minutes,
        "created_at": record.created_at,
        "blockchain_audit": "Demo mode: Polygon audit is not configured yet.",
    }

    if allowed:
        response["temporary_access_token"] = create_token(
            request.wallet_address,
            request.did,
        )
        response["access_expires_in_minutes"] = JWT_EXPIRE_MINUTES

    return response


@app.get("/audit/logs")
def audit_logs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(AccessRequestRecord)
        .order_by(AccessRequestRecord.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": record.id,
            "wallet_address": record.wallet_address,
            "did": record.did,
            "asset_name": record.asset_name,
            "purpose": record.purpose,
            "duration_minutes": record.duration_minutes,
            "decision": record.decision,
            "reason": record.reason,
            "ipfs_cid": record.ipfs_cid,
            "created_at": record.created_at,
        }
        for record in records
    ]
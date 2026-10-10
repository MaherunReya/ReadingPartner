from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserSignup, UserLogin, TokenResponse, UserResponse
from auth import hash_password, verify_password, create_access_token

router= APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", reponse_model=TokenResponse)
def signup(user_data:UserSignup, db:Session=Depends(get_db)):
    existing_user=db.query(User).,filter(User.email==user_data.email).first()
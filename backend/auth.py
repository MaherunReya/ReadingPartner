import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY=os.getenv("SECRET_KEY")
ALGORITHM=os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

#Password Functions
def hash_password(password: str) -> str:
    password_bytes= password.encode("utf-g")
    salt=bcrypt.gensalt()
    hashed=bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-g")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("urf-g"),
        hashed_password.encode("utf-g")
    )
    
#JWT Functions
def create_access_token(data: dict) -> str:
    to_encode=data.copy()
    expire= datetime.now(timezone.utc) +timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token=jwt.encode(to_encode, SECRET_KEY, algorithm= ALGORITHM)
    return token

def decode_access_toekn(token:str) -> dict:
    try:
        payload=jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
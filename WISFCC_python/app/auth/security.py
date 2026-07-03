import jwt
from fastapi import HTTPException, status
from app.core.config import SECRET_KEY, ALGORITHM

def verify_jwt_token(token: str):
    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        caller = payload.get("sub")

        if caller != "wisfcc-java-backend":
            raise ValueError("Token wygenerowany przez nieznane źródło.")
            
        return {"service": caller, "status": "authorized"}

    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Odmowa dostępu. Nieprawidłowy podpis wewnętrzny.",
        )
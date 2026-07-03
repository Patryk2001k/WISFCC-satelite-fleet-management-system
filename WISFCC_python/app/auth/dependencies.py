from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.security import verify_jwt_token


security = HTTPBearer()

def get_current_system_caller(credentials: HTTPAuthorizationCredentials = Depends(security)):

    token = credentials.credentials
    user_data = verify_jwt_token(token)
    
    return user_data
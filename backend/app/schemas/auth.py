from typing import Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    facility_id: Optional[int] = None
    facility_name: Optional[str] = None
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class LogoutResponse(BaseModel):
    detail: str = "Logged out successfully"

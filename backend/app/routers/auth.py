from fastapi import APIRouter, Depends, HTTPException
from app.models import (
    AuthSession,
    User,
    UserLogin,
    UserPasswordChange,
    UserProfileUpdate,
    UserPublic,
    UserRegister,
)
from app.services.auth import UserStore
from app.dependencies import get_user_store, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=AuthSession)
async def register(payload: UserRegister, user_store: UserStore = Depends(get_user_store)) -> AuthSession:
    public_user = user_store.register(payload)
    user = user_store.get_by_username(public_user.username)
    return AuthSession(token=user_store.create_token(user), user=public_user)

@router.post("/login", response_model=AuthSession)
async def login(payload: UserLogin, user_store: UserStore = Depends(get_user_store)) -> AuthSession:
    user = user_store.login(payload)
    return AuthSession(token=user_store.create_token(user), user=UserPublic(**user.model_dump(exclude={"password_hash"})))

@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(**current_user.model_dump(exclude={"password_hash"}))

@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    user_store: UserStore = Depends(get_user_store),
) -> UserPublic:
    return user_store.update_profile(
        username=current_user.username,
        full_name=payload.full_name,
        phone=payload.phone,
        state=payload.state,
        telegram_chat_id=payload.telegram_chat_id
    )

@router.post("/change-password", response_model=UserPublic)
async def change_password(
    payload: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    user_store: UserStore = Depends(get_user_store),
) -> UserPublic:
    return user_store.change_password(
        username=current_user.username,
        old_password=payload.old_password,
        new_password=payload.new_password
    )

@router.get("/users", response_model=list[UserPublic])
async def list_users(
    user_store: UserStore = Depends(get_user_store),
    current_user: User = Depends(get_current_user),
) -> list[UserPublic]:
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can list users.")
    return user_store.list_users()

@router.delete("/users/{username}")
async def delete_user(
    username: str,
    user_store: UserStore = Depends(get_user_store),
    current_user: User = Depends(get_current_user),
):
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users.")
    success = user_store.delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully."}

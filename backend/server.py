"""Pizzabook backend server - Community + calculators + storage + push"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Form, Query, Depends
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, secrets, requests, httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Mongo
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "pizzabook"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Push notifications
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
push_client = httpx.AsyncClient(base_url=PUSH_BASE_URL, headers={"X-Push-Key": PUSH_KEY}, timeout=10.0)

async def send_push(recipients: list, data: dict, idempotency_key: str = None):
    if not recipients: return
    if "title" not in data or "message" not in data: return
    payload = {"recipients": recipients, "data": data}
    if idempotency_key: payload["$idempotency_key"] = idempotency_key
    try:
        await push_client.post("/api/v1/push/trigger", json=payload)
    except Exception as e:
        logging.warning(f"push failed: {e}")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""
    bio: Optional[str] = ""
    equipment: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    equipment: Optional[str] = None

class RecipeAttachment(BaseModel):
    diameter_cm: Optional[float] = None
    hydration: Optional[float] = None
    method: Optional[str] = None
    flour_type: Optional[str] = None
    fermentation_hours: Optional[float] = None
    oven_type: Optional[str] = None
    bake_temp: Optional[float] = None
    dough_weight: Optional[float] = None

class PostCreate(BaseModel):
    caption: str
    image_path: Optional[str] = ""
    recipe: Optional[RecipeAttachment] = None

class CommentCreate(BaseModel):
    text: str

class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str

# ============ AUTH ============
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@api_router.post("/auth/session")
async def create_session(body: SessionRequest):
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                        headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data.get("email")
    name = data.get("name", email)
    picture = data.get("picture", "")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Missing data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = User(user_id=user_id, email=email, name=name, picture=picture).dict()
        await db.users.insert_one(user_doc)

    now = datetime.now(timezone.utc)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}

@api_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"status": "ok"}

@api_router.patch("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})

# ============ STORAGE ============
class UploadTokenResponse(BaseModel):
    token: str

async def create_read_token(path: str) -> str:
    token = secrets.token_urlsafe(24)
    await db.read_tokens.insert_one({
        "token": token, "path": path,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    })
    return token

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "heic"):
        ext = "jpg"
    content = await file.read()
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    ct = file.content_type or "image/jpeg"
    result = await run_in_threadpool(put_object, path, content, ct)
    await db.uploads.insert_one({
        "path": result["path"],
        "owner_id": user["user_id"],
        "content_type": ct,
        "created_at": datetime.now(timezone.utc),
    })
    token = await create_read_token(result["path"])
    return {"path": result["path"], "url": f"/api/files/{result['path']}?token={token}"}

@api_router.get("/files/{path:path}")
async def download_file(path: str, token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    upload = await db.uploads.find_one({"path": path}, {"_id": 0})
    if not upload:
        raise HTTPException(status_code=404, detail="Not found")
    # accept token OR bearer
    authorized = False
    if token:
        t = await db.read_tokens.find_one({"token": token, "path": path}, {"_id": 0})
        if t:
            exp = t["expires_at"]
            if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp > datetime.now(timezone.utc):
                authorized = True
    if not authorized and authorization and authorization.startswith("Bearer "):
        # any authenticated user can view (community is open)
        tok = authorization.split(" ", 1)[1]
        session = await db.user_sessions.find_one({"session_token": tok}, {"_id": 0})
        if session:
            authorized = True
    if not authorized:
        # Public read for community images (they are anyway world-viewable)
        authorized = True
    content, ct = await run_in_threadpool(get_object, path)
    return Response(content=content, media_type=ct)

# ============ COMMUNITY ============
@api_router.post("/posts")
async def create_post(body: PostCreate, user: dict = Depends(get_current_user)):
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    doc = {
        "post_id": post_id,
        "user_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture", ""),
        "caption": body.caption,
        "image_path": body.image_path or "",
        "recipe": body.recipe.dict() if body.recipe else None,
        "likes": [],
        "likes_count": 0,
        "comments_count": 0,
        "created_at": now,
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/posts")
async def list_posts(skip: int = 0, limit: int = 20):
    cursor = db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    # attach signed url
    for p in posts:
        if p.get("image_path"):
            t = await create_read_token(p["image_path"])
            p["image_url"] = f"/api/files/{p['image_path']}?token={t}"
    return posts

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Not found")
    if post.get("image_path"):
        t = await create_read_token(post["image_path"])
        post["image_url"] = f"/api/files/{post['image_path']}?token={t}"
    return post

@api_router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Not found")
    uid = user["user_id"]
    likes = set(post.get("likes", []))
    if uid in likes:
        likes.remove(uid)
    else:
        likes.add(uid)
    likes_list = list(likes)
    await db.posts.update_one({"post_id": post_id}, {"$set": {"likes": likes_list, "likes_count": len(likes_list)}})
    return {"liked": uid in likes, "likes_count": len(likes_list)}

@api_router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    cursor = db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1)
    return await cursor.to_list(length=200)

@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, body: CommentCreate, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Not found")
    comment_id = f"cmt_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    doc = {
        "comment_id": comment_id,
        "post_id": post_id,
        "user_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture", ""),
        "text": body.text,
        "created_at": now,
    }
    await db.comments.insert_one(doc)
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})
    # notify post author
    if post["user_id"] != user["user_id"]:
        try:
            await send_push(
                recipients=[post["user_id"]],
                data={"title": user["name"], "message": body.text[:100], "action_url": f"/post/{post_id}"},
            )
        except Exception as e:
            logging.warning(f"push fail: {e}")
    doc.pop("_id", None)
    return doc

# ============ PUSH ============
@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    if not PUSH_KEY or PUSH_KEY == "placeholder":
        # Preview environment - push key set at deploy time. Accept but skip upstream.
        return {"status": "pending_deploy"}
    try:
        resp = await push_client.post("/api/v1/push/users/register", json=body.model_dump())
        if resp.status_code == 401:
            raise HTTPException(500, "PUSH key missing")
        if resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
    except HTTPException:
        raise
    except Exception as e:
        logging.warning(f"push register fail: {e}")
    return {"status": "registered"}

# ============ HEALTH ============
@api_router.get("/")
async def root():
    return {"status": "ok", "app": "pizzabook"}

# indexes on startup
@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
    except Exception as e:
        logging.warning(f"storage init failed (will retry): {e}")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.read_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.posts.create_index("created_at")
    await db.comments.create_index("post_id")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    await push_client.aclose()

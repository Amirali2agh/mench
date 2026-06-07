from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.health import router as health_router
from app.api.websocket.queue import router as queue_router
from app.api.websocket.room import router as room_router
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG
)

# Set up CORS middleware to allow cross-origin requests from the frontend (React app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to only allow trusted domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include application routers
app.include_router(health_router)
app.include_router(queue_router)
 # این خط را بالا اضافه کنید
app.include_router(room_router) # این خط را پایین اضافه کنید
from fastapi import APIRouter, status
from app.redis_client import redis_client

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Simple health check endpoint to verify that the API is running
    and optionally that it can ping Redis successfully.
    """
    try:
        # Ping Redis to verify connection health
        await redis_client.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "unavailable"
        
    return {
        "status": "healthy",
        "redis": redis_status
    }
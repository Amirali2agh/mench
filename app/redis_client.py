import redis.asyncio as aioredis
from app.config import settings

# ایجاد کلاینت رادیس به صورت آسنکرون (Async) با استفاده از تنظیمات لود شده
redis_client = aioredis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD,
    decode_responses=True  # تبدیل خودکار داده‌های بایتی رادیس به رشته‌های متنی (UTF-8)
)
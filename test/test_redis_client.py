import pytest
from unittest.mock import patch, AsyncMock
from app.redis_client import redis_client

@pytest.mark.asyncio
async def test_redis_client_configuration():
    """تست صحت لود شدن تنظیمات اتصال در کلاینت رادیس بدون اتصال واقعی"""
    connection_kwargs = redis_client.connection_pool.connection_kwargs
    
    # بررسی پارامترها
    import os
    expected_host = os.getenv("REDIS_HOST", "localhost")
    assert connection_kwargs["host"] == expected_host
    assert connection_kwargs["port"] == 6379
    assert connection_kwargs["db"] == 0
    assert connection_kwargs["decode_responses"] is True


@pytest.mark.asyncio
async def test_redis_set_and_get_mocked():
    """تست شبیه‌سازی‌شده (Mock) برای صحت رفتار دستورات آسنکرون set و get رادیس"""
    # شبیه‌سازی کردن دستورات set و get کلاینت رادیس به صورت آسنکرون
    with patch.object(redis_client, "set", new_callable=AsyncMock) as mock_set, \
         patch.object(redis_client, "get", new_callable=AsyncMock) as mock_get:
        
        # مشخص کردن مقدار خروجی پیش‌فرض برای متد شبیه‌سازی‌شده get
        mock_get.return_value = "mensch_player"
        
        # اجرای توابع شبیه‌سازی شده رادیس
        await redis_client.set("game:1:user", "mensch_player")
        result = await redis_client.get("game:1:user")
        
        # بررسی اینکه متد set دقیقاً با همین ورودی‌ها یک بار صدا زده شده است
        mock_set.assert_called_once_with("game:1:user", "mensch_player")
        
        # بررسی اینکه مقدار بازگشتی get درست شبیه‌سازی شده است
        assert result == "mensch_player"
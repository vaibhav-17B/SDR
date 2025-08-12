import os
import redis
from datetime import datetime, timedelta
import json

class RedisSessionManager:
    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "localhost")
        self.port = int(os.getenv("REDIS_PORT", 6379))
        self.db = int(os.getenv("REDIS_DB", 0))
        self.password = os.getenv("REDIS_PASSWORD", None)
        self.client = self._connect()

    def _connect(self):
        try:
            client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                password=self.password,
                decode_responses=True
            )
            client.ping()
            print("Redis connection successful")
            return client
        except Exception as e:
            print(f"Redis connection failed: {e}")
            return None

    def store_oauth_state(self, state: str, expiry_minutes: int = 10):
        if not self.client:
            raise Exception("Redis connection not available")

        try:
            self.client.setex(
                f"oauth_state:{state}",
                timedelta(minutes=expiry_minutes),
                "valid"
            )
            print(f"OAuth state {state} stored in Redis")
            return True
        except Exception as e:
            print(f"Failed to store OAuth state in Redis: {e}")
            return False

    def verify_oauth_state(self, state: str):
        if not self.client:
            return False

        try:
            key = f"oauth_state:{state}"
            if self.client.exists(key):
                self.client.delete(key)
                print(f"OAuth state {state} verified and deleted")
                return True
            return False
        except Exception as e:
            print(f"Failed to verify OAuth state in Redis: {e}")
            return False

    def store_session_data(self, session_id: str, auth_data: dict, expiry_hours: int = 24):
        if not self.client:
            raise Exception("Redis connection not available")

        try:
            auth_data['created_at'] = datetime.now().isoformat()
            self.client.setex(
                f"session:{session_id}",
                timedelta(hours=expiry_hours),
                json.dumps(auth_data)
            )
            print(f"Session {session_id} stored in Redis")
            return True
        except Exception as e:
            print(f"Failed to store session in Redis: {e}")
            return False

    def get_session_data(self, session_id: str):
        if not self.client:
            return None

        try:
            data = self.client.get(f"session:{session_id}")
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Failed to get session from Redis: {e}")
            return None

    def delete_session_data(self, session_id: str):
        if not self.client:
            return False

        try:
            result = self.client.delete(f"session:{session_id}")
            print(f"Session {session_id} deleted from Redis")
            return result > 0
        except Exception as e:
            print(f"Failed to delete session from Redis: {e}")
            return False

    def get_all_session_keys(self):
        if not self.client:
            return []

        try:
            return self.client.keys("session:*")
        except Exception as e:
            print(f"Failed to get session keys from Redis: {e}")
            return []

    def get_all_oauth_state_keys(self):
        if not self.client:
            return []

        try:
            return self.client.keys("oauth_state:*")
        except Exception as e:
            print(f"Failed to get OAuth state keys from Redis: {e}")
            return []

    def cleanup_expired_sessions(self):
        if not self.client:
            return 0

        try:
            session_keys = self.client.keys("session:*")
            expired_count = 0
            for key in session_keys:
                ttl = self.client.ttl(key)
                if ttl == -1:
                    self.client.expire(key, timedelta(hours=24))
                elif ttl == -2:
                    expired_count += 1

            print(f"Cleaned up {expired_count} expired sessions")
            return expired_count
        except Exception as e:
            print(f"Failed to cleanup expired sessions: {e}")
            return 0

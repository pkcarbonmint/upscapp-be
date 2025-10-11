from pydantic_settings import BaseSettings


class AuthConfig(BaseSettings):
    JWT_ALG: str = "HS256"
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_EXP: int = 30  # minutes

    REFRESH_TOKEN_KEY: str = "refreshToken"
    REFRESH_TOKEN_EXP: int = 60 * 60 * 24 * 21  # 21 days

    SECURE_COOKIES: bool = True
    FIREBASE_CERT: str | None = None
    FIREBASE_CERT_FILE: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


auth_config = AuthConfig()

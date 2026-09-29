import os
from pathlib import Path

# Prevent OpenBLAS/OpenMP memory allocation failures in multi-threaded environments on Windows
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass


BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", os.getenv("SECRET_KEY", "django-insecure-change-me"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Allowed Hosts configuration for Render and local development
allowed_hosts_raw = os.getenv("ALLOWED_HOSTS", "*")
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(",") if h.strip()]
if ".onrender.com" not in ALLOWED_HOSTS and "*" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.extend([".onrender.com", "localhost", "127.0.0.1"])

# Trust proxy SSL header when hosted on Render
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

INSTALLED_APPS = [
    "daphne",   
    "django.contrib.staticfiles",
    "django.contrib.sessions",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "corsheaders",
    "interviewer",
    "accounts",
    "recruiter",
    "user",
    "channels",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ai_interviewer.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ai_interviewer.wsgi.application"

# DATABASES Configuration: DATABASE_URL, PostgreSQL, or SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("true", "1", "yes")

if DATABASE_URL and not USE_SQLITE:
    try:
        import dj_database_url
        parsed_db = dj_database_url.parse(DATABASE_URL, conn_max_age=600)
        if parsed_db:
            if not parsed_db.get("NAME"):
                parsed_db["NAME"] = "postgres"
            DATABASES = {"default": parsed_db}
        else:
            raise ValueError("Invalid DATABASE_URL format")
    except Exception as e:
        print(f"Warning: Failed to parse DATABASE_URL ({e}), falling back to SQLite")
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
elif not USE_SQLITE and os.getenv("DB_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.postgresql").strip("\"'").strip(),
            "NAME": os.getenv("DB_NAME", "postgres").strip("\"'").strip() or "postgres",
            "USER": os.getenv("DB_USER", "postgres").strip("\"'").strip(),
            "PASSWORD": os.getenv("DB_PASSWORD", "").strip("\"'").strip(),
            "HOST": os.getenv("DB_HOST", "").strip("\"'").strip(),
            "PORT": os.getenv("DB_PORT", "5432").strip("\"'").strip(),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Channels
ASGI_APPLICATION = "ai_interviewer.asgi.application"

# Channel Layer: In-memory (or Redis if REDIS_URL configured)
REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

SESSION_ENGINE     = "django.contrib.sessions.backends.db"
SESSION_COOKIE_AGE = 86400

GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "").strip("\"'").strip()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip("\"'").strip()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip("\"'").strip()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip("\"'").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip("\"'").strip()

EMAIL_BACKEND       = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST          = "smtp.gmail.com"
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

ATS_PASS_THRESHOLD = float(os.getenv("ATS_PASS_THRESHOLD", "40.0"))

LOGIN_URL = "/login/"

# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'interviewer.authentication.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS Settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "False").lower() in ("true", "1", "yes")

cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

csrf_origins_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if csrf_origins_env:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_origins_env.split(",") if origin.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
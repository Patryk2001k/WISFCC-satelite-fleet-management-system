
import os
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent

BASE_DIR = CURRENT_DIR.parent
ENV_PATH = BASE_DIR / "conf.env"

load_dotenv(dotenv_path=ENV_PATH)


SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_fallback")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

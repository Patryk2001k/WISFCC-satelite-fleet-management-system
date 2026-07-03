from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="WISFCC Python Math Engine",
    description="Microservice to astro calculations",
    version="1.0.0"
)

# Konfiguracja CORS (pozwalamy Javie i Reactowi na komunikację)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Możesz tu wpisać konkretnie ["http://localhost:8080", "http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Podłączenie naszych adresów URL z pliku endpoints.py
app.include_router(api_router, prefix="/api")
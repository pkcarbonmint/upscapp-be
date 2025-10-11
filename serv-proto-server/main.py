import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# In a real app, you'd use a more robust data modeling solution
# For now, we'll use Pydantic models that mirror the Elm types
from typing import List, Optional
from pydantic import BaseModel

# --- Data Models (you would expand these based on your Elm types) ---
class Plan(BaseModel):
    id: str
    title: str
    # ... other fields

# --- API Router ---
router = APIRouter(prefix="/api/mentora")

@router.get("/health")
def health_check():
    return {"status": "ok"}

# Example endpoint from our spec
@router.get("/student/{student_id}/dashboard")
def get_student_dashboard(student_id: str):
    # In a real implementation, you would fetch and process real data.
    # For this prototype, we return a mock dashboard structure.
    print(f"Fetching dashboard for student: {student_id}")
    return {
        "today_tasks": [],
        "next_session": None,
        "upcoming_test": None,
        "weekly_progress_percent": 0
    }

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Mentora API",
    description="Backend server for the Mentora UPSC Mentorship Platform.",
    version="0.1.0",
)

# CORS (Cross-Origin Resource Sharing) Middleware
# This is crucial for allowing the Elm frontend (on a different port)
# to communicate with this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Mentora API. Visit /docs for API documentation."}


if __name__ == "__main__":
    # This allows running the server directly for development
    # Use `uvicorn main:app --reload` for production-like development
    uvicorn.run(app, host="0.0.0.0", port=8000)

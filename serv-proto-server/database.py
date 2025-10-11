# In-memory/Pickle file database for the prototype
import pickle
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def get_db():
    # In a real app, this would establish a database connection.
    # For the prototype, we'll just use a dictionary.
    return {}

def load_data(name: str):
    """Loads data from a pickle file."""
    file_path = DATA_DIR / f"{name}.pkl"
    if not file_path.exists():
        return None
    try:
        with open(file_path, "rb") as f:
            return pickle.load(f)
    except (pickle.UnpicklingError, EOFError):
        return None

def save_data(name: str, data):
    """Saves data to a pickle file."""
    file_path = DATA_DIR / f"{name}.pkl"
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        pickle.dump(data, f)

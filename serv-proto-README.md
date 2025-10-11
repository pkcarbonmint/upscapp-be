# Mentora UPSC Mentorship Platform - Prototype

This project contains the backend and frontend prototypes for the Mentora platform.

## Project Structure

- `server/`: The Python FastAPI backend server.
- `mentora-ui/`: The Elm frontend application.
- `mentorship-notes/`: Project design and specification documents.

## How to Run the Prototype

You need to run the backend server and the frontend development server in two separate terminals.

### 1. Run the Backend Server

```bash
# Navigate to the server directory
cd serv-proto-server

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the server
# The --reload flag makes the server restart on code changes.
uvicorn main:app --reload
```

The server will be running at `http://localhost:8000`.

### 2. Run the Frontend Application

Make sure you have Elm installed. See the official guide: https://guide.elm-lang.org/install/elm.html

```bash
# Navigate to the Elm UI directory
cd mentora-ui

# Install Elm dependencies (if you haven't already)
elm install

# Start the development server
# This will open the application in your browser.
elm-live src/Main.elm --open -- --debug
```

The frontend will be running at `http://localhost:8080` and will communicate with the Python server at `http://localhost:8000`.

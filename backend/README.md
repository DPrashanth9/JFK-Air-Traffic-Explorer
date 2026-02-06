# Backend API - JFK Air Traffic Explorer

Python FastAPI backend for the JFK Air Traffic Explorer application.

## Setup Instructions

### 1. Create Virtual Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Neo4j credentials:

```bash
cp .env.example .env
# Edit .env with your Neo4j connection details
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at: http://localhost:8000

### 5. Test the API

Open your browser and visit:
- http://localhost:8000/ - Root endpoint
- http://localhost:8000/health - Health check
- http://localhost:8000/docs - Interactive API documentation (Swagger UI)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app and CORS setup
│   ├── models/          # Data models (Pydantic schemas)
│   ├── routes/          # API endpoint routes
│   ├── services/        # Business logic
│   └── database/        # Neo4j connection and queries
├── scripts/
│   └── import_data.py   # Script to import flights.json into Neo4j
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variable template
└── README.md            # This file
```

## Development

The server runs with `--reload` flag, so it will automatically restart when you make changes to the code.

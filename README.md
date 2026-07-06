# CivicPulse

AI Grievance Redressal & Insight Engine for civic issue reporting, routing, hotspot detection, and natural-language analytics.

Citizens can report potholes, garbage, water leaks, streetlight issues, and other civic problems through text, photo metadata, and voice transcript fields. The backend uses Gemini when configured, and falls back to local heuristics for hackathon demos. Complaint records can be stored in Firestore or in a local JSON file. Officials can ask analytics questions that are answered through BigQuery when configured, with local summary responses as a fallback.

App Link : https://civicpulse-frontend-196436593305.asia-east1.run.app/

## Architecture

```text
React Dashboard
  | submit complaints, view triage, ask analytics
FastAPI Backend
  | classify + route + duplicate detect + hotspot cluster
Gemini
  | multimodal complaint understanding and NL-to-SQL
Firestore
  | live complaint tracking
BigQuery
  | civic analytics warehouse
Cloud Run
  | containerized deployment
```

## Project Structure

```text
backend/      FastAPI app and service integrations
frontend/     Vite React dashboard
deploy/       Cloud Run deployment notes
.env.example  Configuration template
```

## Quick Start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Cloud Configuration

The app runs without cloud credentials for demos. To enable managed services, set:

- `GOOGLE_API_KEY` for Gemini
- `USE_FIRESTORE=true`
- `GOOGLE_CLOUD_PROJECT`
- `FIRESTORE_COLLECTION=complaints`
- `BIGQUERY_DATASET=civicpulse`
- `BIGQUERY_TABLE=complaints`

For Cloud Run, configure these as service environment variables and grant the runtime service account Firestore and BigQuery permissions.

## API Highlights

- `POST /auth/register` creates an active citizen account with a unique username and required phone number.
- `POST /auth/login` returns a bearer token for existing active accounts.
- `GET /auth/me` validates the current session.
- `POST /complaints` accepts text, location, ward, optional photo, and optional voice transcript.
- `GET /complaints` returns live complaint records.
- `GET /hotspots` returns ward/category clusters and severity.
- `POST /analytics/query` answers official questions like `which wards had the most water complaints this month?`.
- `GET /health` confirms service readiness.

All dashboard complaint and analytics endpoints require `Authorization: Bearer <token>` after login. Submitted complaints automatically inherit the logged-in user's full name, unique username, and phone number for notification workflows.

## GCP deployment steps

### GCP CLI Setup
```
Log in to your Google Cloud SDK
gcloud auth login

Set your active project
gcloud config set project [YOUR_PROJECT_ID]

Enable Google APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com
```

### Deploy Backend (FastAPI)
```
cd backend

# Build and deploy backend to Cloud Run, enabling Firestore persistence
gcloud run deploy civicpulse-backend \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars="USE_FIRESTORE=true,GOOGLE_CLOUD_PROJECT=[YOUR_PROJECT_ID],GOOGLE_API_KEY=[GEMINI_API_KEY]"
```

### Deploy Frontend (Vite + Nginx)

```
cd ../frontend

# Build and deploy frontend, configuring the backend URL at runtime via env variables
gcloud run deploy civicpulse-frontend \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 80 \
    --set-env-vars="VITE_API_BASE=https://civicpulse-backend-xxxx.a.run.app"
```


### Configure CORS on Backend
To allow the frontend to communicate with the backend, add the frontend origin to the backend's allowed CORS origins:

```
gcloud run services update civicpulse-backend \
    --region us-central1 \
    --update-env-vars="API_CORS_ORIGINS=https://civicpulse-frontend-xxxx.a.run.app"
```


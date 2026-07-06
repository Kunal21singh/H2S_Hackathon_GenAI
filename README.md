# 🏛️ CivicPulse: AI-Powered Grievance Redressal & Diagnostics Engine

CivicPulse is an advanced, high-performance web platform designed to streamline civic issue reporting, automated triage, regional monitoring, and analytics. It empowers citizens to submit grievances and gives municipal administrators deep data-driven diagnostics.

The system features multi-modal AI inputs, automated department routing, duplicate detection, hotspot mapping, interactive analytics, and natural language query processing.

---

## 🚀 Key Features

### 1. Citizen Intake & AI Assistance
* **Multimodal Image Analysis**: Upload a photo of a civic issue, and the built-in Gemini model will automatically identify the problem and generate a detailed report, pre-filling the complaint form.
* **Voice Transcription**: Record voice complaints directly inside the browser using integrated speech-to-text.
* **Interactive Hotspot Map**: Real-time visualization of surrounding grievances, highlighting localized community issues.

### 2. Automated Smart Routing & Duplicate Triage
* **AI Classification**: Automatically extracts categories, assigns priorities (Low, Medium, High, Critical), and routes reports to respective departments (Water, Roads, Sanitation, etc.).
* **Deduplication Engine**: Automatically cross-references incoming reports with existing active cases in the same vicinity, flagging duplicates to avoid redundant field deployments.

### 3. Executive diagnostics & Row-Level Control
* **Role-Based Analytics**: Fully customized access control. Users see statistics, timelines, and metrics tailored specifically to their access clearance:
  * **Prime Minister & System Admins**: Global access to national-level metrics and cross-state comparisons.
  * **Chief Ministers**: Restricts reports, maps, and insights to their designated state only.
  * **Department Officers**: Limits analytics strictly to their specific department and state (e.g. Karnataka Water Works).
  * **Citizens**: Access to local public dashboards.
* **Smart AI Diagnostics**: Automatically scans the active dataset to generate dynamic insights, bottleneck alerts, regional achievements, and load warnings.

---

## 🛠️ Google Cloud Platform (GCP) Architecture

CivicPulse leverages enterprise GCP services to ensure secure, real-time, serverless operations:

| GCP Service | Component Role |
| :--- | :--- |
| **Google Cloud Run** | Hosts containerized microservices for both the FastAPI Backend and Vite React Frontend. |
| **Cloud Firestore (Native Mode)** | Serves as the primary, real-time database to persist complaints, timeline logs, notifications, and user access records. |
| **Gemini Pro (`gemini-2.5-flash`)** | Drives multimodal image description, grievance classification, department routing, and answers natural language inquiries. |
| **Google BigQuery** | Performs large-scale civic data analysis and allows administrators to ask questions in plain English via NL-to-SQL. |
| **Google Maps Geocoding API** | Translates textual addresses and landmarks into physical GPS coordinates. |

---

## 📂 Project Structure

* 📂 **[backend/]**: Python FastAPI backend service, AI logic, and database integrations.
* 📂 **[frontend/]**: Vite React app styled with midnight-glassmorphism.
* 📄 **[.env.example]**: Environment variables template.

---

## 💻 Local Setup & Execution

### 1. Backend Service
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Copy the environment configuration template and set your credentials:
   ```powershell
   copy ..\.env.example .env
   ```
5. Start the FastAPI server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

### 2. Frontend Dashboard
1. Navigate to the frontend directory:
   ```powershell
   cd ../frontend
   ```
2. Install node dependencies:
   ```powershell
   npm install
   ```
3. Run the hot-reloading development server:
   ```powershell
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## ☁️ Google Cloud Deployment (Cloud Run)

### 1. Initial Authentication & Project Setup
```powershell
# Authenticate gcloud CLI
gcloud auth login

# Select your GCP Project ID
gcloud config set project [YOUR_PROJECT_ID]

# Enable mandatory APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com
```

### 2. Deploy the Backend Service
Compile and push the FastAPI container:
```powershell
cd backend
gcloud run deploy civicpulse-backend \
    --source . \
    --platform managed \
    --region asia-east1 \
    --allow-unauthenticated \
    --set-env-vars="USE_FIRESTORE=true,GOOGLE_CLOUD_PROJECT=[YOUR_PROJECT_ID],GOOGLE_API_KEY=[GEMINI_API_KEY]"
```
*(Copy the generated service URL, e.g., `https://civicpulse-backend-196436593305.asia-east1.run.app`)*

### 3. Deploy the Frontend Dashboard
Build and push the static Vite/React container. The container runs a shell wrapper to dynamically substitute the backend API base address at startup:
```powershell
cd ../frontend
gcloud run deploy civicpulse-frontend \
    --source . \
    --platform managed \
    --region asia-east1 \
    --allow-unauthenticated \
    --port 80 \
    --set-env-vars="VITE_API_BASE=https://civicpulse-backend-196436593305.asia-east1.run.app"
```

### 4. Enable Cross-Origin Resource Sharing (CORS)
Instruct the backend Cloud Run service to accept incoming cross-origin network calls from your frontend domain:
```powershell
gcloud run services update civicpulse-backend \
    --region asia-east1 \
    --update-env-vars="API_CORS_ORIGINS=https://civicpulse-frontend-196436593305.asia-east1.run.app"
```

---

## 👥 Usage & Roles Workflow

1. **Register/Login Screen**:
   * Features flag drop-down selectors and automatic 10-digit validation.
2. **Citizen Portal**:
   * Reports complaints using text, photo attachment, or voice recordings.
   * Visualizes hotspots in their district.
3. **Regional Executives (CM/PM)**:
   * Prime Minister accesses national diagnostic summaries and compares performance indicators.
   * Chief Ministers track stats and department performance restricted strictly to their states.
4. **Department Officers**:
   * Reviews and triages assigned queues. Logs updates and resolves issues. All dashboard graphs, timelines, and analytical diagnostics reflect only their access limits.

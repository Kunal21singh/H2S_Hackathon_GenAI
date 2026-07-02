# Cloud Run Deployment

## Build and Deploy

```bash
gcloud builds submit backend --tag gcr.io/PROJECT_ID/civicpulse-api
gcloud run deploy civicpulse-api \
  --image gcr.io/PROJECT_ID/civicpulse-api \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=cloud,GOOGLE_CLOUD_PROJECT=PROJECT_ID,USE_FIRESTORE=true,FIRESTORE_COLLECTION=complaints,BIGQUERY_DATASET=civicpulse,BIGQUERY_TABLE=complaints
```

Add `GOOGLE_API_KEY` as a secret-backed environment variable in Cloud Run for Gemini calls.

## BigQuery Table Shape

Create a table named `PROJECT_ID.civicpulse.complaints` with fields:

```text
id STRING
text STRING
ward STRING
lat FLOAT
lng FLOAT
status STRING
category STRING
department STRING
priority STRING
duplicate_of STRING
created_at TIMESTAMP
```

For a production build, attach a Firestore trigger or scheduled export to keep BigQuery synchronized.


# Firestore to BigQuery Sync

The demo API stores complaint records in Firestore when `USE_FIRESTORE=true`. For analytics at city scale, mirror those documents into BigQuery.

## Hackathon Option

Use a scheduled Cloud Run job or Cloud Function that reads the Firestore `complaints` collection and upserts rows into `PROJECT_ID.civicpulse.complaints`.

## Production Option

Use the Firebase Export Collections to BigQuery extension, then create a clean analytics view:

```sql
CREATE OR REPLACE VIEW `PROJECT_ID.civicpulse.complaint_view` AS
SELECT
  JSON_VALUE(data, '$.id') AS id,
  JSON_VALUE(data, '$.text') AS text,
  JSON_VALUE(data, '$.ward') AS ward,
  SAFE_CAST(JSON_VALUE(data, '$.lat') AS FLOAT64) AS lat,
  SAFE_CAST(JSON_VALUE(data, '$.lng') AS FLOAT64) AS lng,
  JSON_VALUE(data, '$.status') AS status,
  JSON_VALUE(data, '$.classification.category') AS category,
  JSON_VALUE(data, '$.classification.department') AS department,
  JSON_VALUE(data, '$.classification.priority') AS priority,
  JSON_VALUE(data, '$.duplicate_of') AS duplicate_of,
  TIMESTAMP(JSON_VALUE(data, '$.created_at')) AS created_at
FROM `PROJECT_ID.firestore_export.complaints_raw_latest`;
```


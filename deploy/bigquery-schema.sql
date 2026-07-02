CREATE SCHEMA IF NOT EXISTS `PROJECT_ID.civicpulse`;

CREATE TABLE IF NOT EXISTS `PROJECT_ID.civicpulse.complaints` (
  id STRING NOT NULL,
  text STRING,
  ward STRING,
  lat FLOAT64,
  lng FLOAT64,
  status STRING,
  category STRING,
  department STRING,
  priority STRING,
  duplicate_of STRING,
  created_at TIMESTAMP
);


from collections import Counter
from datetime import datetime, timezone
from typing import Any

from app.config import Settings
from app.models import AnalyticsAnswer, Complaint


async def answer_question(settings: Settings, question: str, complaints: list[Complaint]) -> AnalyticsAnswer:
    if settings.google_api_key and settings.google_cloud_project:
        cloud_answer = await _try_bigquery_answer(settings, question)
        if cloud_answer:
            return cloud_answer
    return _local_answer(question, complaints)


async def _try_bigquery_answer(settings: Settings, question: str) -> AnalyticsAnswer | None:
    try:
        import google.generativeai as genai
        from google.cloud import bigquery

        table = f"`{settings.google_cloud_project}.{settings.bigquery_dataset}.{settings.bigquery_table}`"
        genai.configure(api_key=settings.google_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
You convert civic analytics questions into BigQuery Standard SQL.
Use only this table: {table}.
Columns: id, text, ward, lat, lng, status, category, department, priority, duplicate_of, created_at.
Return only SQL. Question: {question}
"""
        response = await model.generate_content_async(prompt)
        sql = response.text.strip().strip("`").removeprefix("sql").strip()
        client = bigquery.Client(project=settings.google_cloud_project)
        rows = [dict(row.items()) for row in client.query(sql).result(max_results=50)]
        return AnalyticsAnswer(
            question=question,
            answer=f"Found {len(rows)} row(s) from BigQuery.",
            sql=sql,
            rows=rows,
            source="bigquery",
        )
    except Exception:
        return None


def _local_answer(question: str, complaints: list[Complaint]) -> AnalyticsAnswer:
    normalized = question.lower()
    active = [item for item in complaints if not item.duplicate_of]
    if "ward" in normalized and ("most" in normalized or "top" in normalized):
        counts = Counter(item.ward for item in active)
        rows = [{"ward": ward, "complaints": count} for ward, count in counts.most_common(5)]
        answer = _format_leader("Top wards by complaints", rows, "ward")
    elif any(word in normalized for word in ["water", "leak"]):
        filtered = [item for item in active if item.classification.category.value == "water_leak"]
        counts = Counter(item.ward for item in filtered)
        rows = [{"ward": ward, "water_complaints": count} for ward, count in counts.most_common(5)]
        answer = _format_leader("Water complaint concentration", rows, "ward")
    elif "priority" in normalized or "urgent" in normalized:
        counts = Counter(item.classification.priority for item in active)
        rows = [{"priority": priority, "complaints": count} for priority, count in counts.most_common()]
        answer = _format_leader("Priority mix", rows, "priority")
    else:
        counts = Counter(item.classification.category.value for item in active)
        rows = [{"category": category, "complaints": count} for category, count in counts.most_common()]
        answer = _format_leader("Complaint categories", rows, "category")

    return AnalyticsAnswer(
        question=question,
        answer=answer,
        sql=None,
        rows=rows,
        source=f"local-demo-{datetime.now(timezone.utc).date().isoformat()}",
    )


def _format_leader(title: str, rows: list[dict[str, Any]], label_key: str) -> str:
    if not rows:
        return "No matching complaints yet."
    leader = rows[0]
    metric_key = next(key for key in leader if key != label_key)
    return f"{title}: {leader[label_key]} leads with {leader[metric_key]} complaint(s)."


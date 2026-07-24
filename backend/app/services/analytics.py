from __future__ import annotations
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from app.config import Settings
from app.models import AnalyticsAnswer, Complaint


async def answer_question(settings: Settings, question: str, complaints: list[Complaint]) -> AnalyticsAnswer:
    if settings.vertex_ai_search_datastore_id:
        vertex_answer = await _try_vertex_ai_search(settings, question)
        if vertex_answer:
            return vertex_answer

    # Try Gemini Conversational Agent first to answer accurately using active complaints database context
    agent_answer = await _gemini_analytics_agent(settings, question, complaints)
    if agent_answer:
        return agent_answer

    if settings.google_api_key and settings.google_cloud_project:
        cloud_answer = await _try_bigquery_answer(settings, question)
        if cloud_answer:
            return cloud_answer
    return _local_answer(question, complaints)


async def _gemini_analytics_agent(settings: Settings, question: str, complaints: list[Complaint]) -> AnalyticsAnswer | None:
    import json
    
    complaint_data = []
    for c in complaints:
        complaint_data.append({
            "id": c.id,
            "text": c.text,
            "place": c.place,
            "state": c.state,
            "status": c.status.value,
            "category": c.classification.category.value,
            "department": c.classification.department,
            "priority": c.classification.priority,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
        
    prompt = f"""
You are the CivicPulse Analytics Assistant, a Vertex AI conversational agent designed to analyze citizen complaints and provide accurate, natural language statistics and insights.

Below is the list of active complaints in the system in JSON format:
{json.dumps(complaint_data, indent=2)}

Please answer the user's question accurately using only the data provided above.
Provide a clear, detailed, and polite response in natural language. Use markdown list formats if necessary to list findings.
User Question: {question}
"""

    # 1. Try Google AI Studio Gemini API (Fast, API Key)
    if settings.google_api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = await model.generate_content_async(prompt)
            return AnalyticsAnswer(
                question=question,
                answer=response.text.strip(),
                sql=None,
                rows=[],
                source="vertex-ai-gemini-agent",
            )
        except Exception as e:
            print(f"AI Studio agent analysis failed, checking Vertex AI: {e}")

    # 2. Try Vertex AI Gemini (Uses GCP Credits)
    if settings.google_cloud_project:
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel

            vertexai.init(project=settings.google_cloud_project, location="us-central1")
            model = GenerativeModel("gemini-2.5-flash")
            response = await model.generate_content_async(prompt)
            return AnalyticsAnswer(
                question=question,
                answer=response.text.strip(),
                sql=None,
                rows=[],
                source="vertex-ai-gemini-agent",
            )
        except Exception as e:
            print(f"Vertex AI agent analysis failed: {e}")

    return None


async def _try_vertex_ai_search(settings: Settings, question: str) -> AnalyticsAnswer | None:
    try:
        from google.cloud import discoveryengine_v1beta as discoveryengine

        project_id = settings.vertex_ai_search_project_id or settings.google_cloud_project
        if not project_id:
            return None

        client = discoveryengine.SearchServiceClient()
        serving_config = client.serving_config_path(
            project=project_id,
            location=settings.vertex_ai_search_location,
            data_store=settings.vertex_ai_search_datastore_id,
            serving_config="default_serving_config",
        )

        request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=question,
            page_size=5,
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                summary_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec(
                    summary_result_count=3,
                    include_citations=True,
                    ignore_adversarial_query=True
                )
            )
        )

        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: client.search(request))

        summary = ""
        if response.summary and response.summary.summary_text:
            summary = response.summary.summary_text

        rows = []
        for result in response.results:
            doc = result.document
            doc_data = {}
            if doc.derived_struct_data:
                try:
                    from google.protobuf.json_format import MessageToDict
                    doc_data = MessageToDict(doc.derived_struct_data)
                except Exception:
                    doc_data = dict(doc.derived_struct_data)
            else:
                doc_data = {
                    "id": doc.id,
                    "name": doc.name,
                }
            rows.append(doc_data)

        if summary or rows:
            return AnalyticsAnswer(
                question=question,
                answer=summary or f"Found {len(rows)} matching document(s) from Vertex AI Search.",
                sql=None,
                rows=rows,
                source="vertex-ai-search",
            )
    except Exception as e:
        print(f"Vertex AI Search error: {e}")
        return None
    return None


async def _try_bigquery_answer(settings: Settings, question: str) -> AnalyticsAnswer | None:
    try:
        from google.cloud import bigquery
        table = f"`{settings.google_cloud_project}.{settings.bigquery_dataset}.{settings.bigquery_table}`"
        prompt = f"""
You convert civic analytics questions into BigQuery Standard SQL.
Use only this table: {table}.
Columns: id, text, ward, place, state, lat, lng, status, category, department, priority, duplicate_of, created_at.
Return only SQL. Question: {question}
"""
        sql = None

        # 1. Try Google AI Studio Gemini API (Developer Key)
        if settings.google_api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=settings.google_api_key)
                model = genai.GenerativeModel("gemini-2.5-flash")
                response = await model.generate_content_async(prompt)
                sql = response.text.strip().strip("`").removeprefix("sql").strip()
            except Exception as e:
                print(f"AI Studio BigQuery SQL generator failed, checking Vertex AI: {e}")

        # 2. Try Vertex AI Gemini (Paid GCP Billing - Consumes Credits)
        if not sql and settings.google_cloud_project:
            try:
                import vertexai
                from vertexai.generative_models import GenerativeModel

                vertexai.init(project=settings.google_cloud_project, location="us-central1")
                model = GenerativeModel("gemini-2.5-flash")
                response = await model.generate_content_async(prompt)
                sql = response.text.strip().strip("`").removeprefix("sql").strip()
            except Exception as e:
                print(f"Vertex AI BigQuery SQL generator failed: {e}")

        if not sql:
            return None

        client = bigquery.Client(project=settings.google_cloud_project)
        rows = [dict(row.items()) for row in client.query(sql).result(max_results=50)]
        return AnalyticsAnswer(
            question=question,
            answer=f"Found {len(rows)} row(s) from BigQuery.",
            sql=sql,
            rows=rows,
            source="bigquery",
        )
    except Exception as e:
        print(f"BigQuery execution error: {e}")
        return None


def _local_answer(question: str, complaints: list[Complaint]) -> AnalyticsAnswer:
    normalized = question.lower()
    active = [item for item in complaints if not item.duplicate_of]
    if any(word in normalized for word in ["ward", "place"]) and ("most" in normalized or "top" in normalized):
        counts = Counter(item.place for item in active)
        rows = [{"place": place, "complaints": count} for place, count in counts.most_common(5)]
        answer = _format_leader("Top places by complaints", rows, "place")
    elif any(word in normalized for word in ["water", "leak"]):
        filtered = [item for item in active if item.classification.category.value == "water_leak"]
        counts = Counter(item.place for item in filtered)
        rows = [{"place": place, "water_complaints": count} for place, count in counts.most_common(5)]
        answer = _format_leader("Water complaint concentration", rows, "place")
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


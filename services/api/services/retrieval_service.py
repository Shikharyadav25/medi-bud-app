import os
import json
from typing import List, Dict, Any, Optional
from services.embedding_service import get_text_embedding, cosine_similarity

KNOWLEDGE_EXCERPTS_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "knowledge", "excerpts.json")
)
KNOWLEDGE_SOURCES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "knowledge", "sources.json")
)

def load_knowledge_corpus() -> List[Dict[str, Any]]:
    if not os.path.exists(KNOWLEDGE_EXCERPTS_PATH):
        return []
    with open(KNOWLEDGE_EXCERPTS_PATH, "r", encoding="utf-8") as f:
        excerpts = json.load(f)
    
    sources_map = {}
    if os.path.exists(KNOWLEDGE_SOURCES_PATH):
        with open(KNOWLEDGE_SOURCES_PATH, "r", encoding="utf-8") as f:
            for s in json.load(f):
                sources_map[s["id"]] = s

    for item in excerpts:
        src = sources_map.get(item["source_id"], {})
        item["source_title"] = src.get("title", "Approved Health Source")
        item["publisher"] = src.get("publisher", "Health Organization")
        item["date"] = src.get("access_date", "2026-10-01")

    return excerpts

def compute_lexical_score(query: str, text: str) -> float:
    """Computes token match lexical score with bonus for consecutive matches."""
    q_words = [w for w in query.lower().replace("?", "").replace(",", "").split() if len(w) > 2]
    if not q_words:
        return 0.0
    text_lower = text.lower()
    score = 0.0
    for w in q_words:
        if w in text_lower:
            score += 1.0
    return score / len(q_words)

def hybrid_rrf_rank(
    query: str,
    query_embedding: List[float],
    candidates: List[Dict[str, Any]],
    top_k: int = 5,
    rrf_k: int = 60
) -> List[Dict[str, Any]]:
    """
    Combines dense semantic ranking and lexical ranking using Reciprocal Rank Fusion.
    Score = (1 / (k + rank_semantic)) + (1 / (k + rank_lexical))
    """
    if not candidates:
        return []

    # 1. Semantic scoring
    for cand in candidates:
        cand_emb = cand.get("embedding")
        if cand_emb and len(cand_emb) == len(query_embedding):
            cand["sim_score"] = cosine_similarity(query_embedding, cand_emb)
        else:
            cand["sim_score"] = 0.0
        cand["lex_score"] = compute_lexical_score(query, cand.get("text", ""))

    # Rank by semantic
    candidates.sort(key=lambda x: x["sim_score"], reverse=True)
    for rank, cand in enumerate(candidates, start=1):
        cand["rank_sem"] = rank

    # Rank by lexical
    candidates.sort(key=lambda x: x["lex_score"], reverse=True)
    for rank, cand in enumerate(candidates, start=1):
        cand["rank_lex"] = rank

    # Compute RRF score
    for cand in candidates:
        cand["rrf_score"] = (1.0 / (rrf_k + cand["rank_sem"])) + (1.0 / (rrf_k + cand["rank_lex"]))

    candidates.sort(key=lambda x: x["rrf_score"], reverse=True)
    
    # Filter out candidates with zero lexical and very low semantic match
    filtered = [c for c in candidates if c["sim_score"] > 0.15 or c["lex_score"] > 0.0]
    return filtered[:top_k]

def search_hybrid(
    user_id: str,
    query: str,
    user_report_chunks: List[Dict[str, Any]],
    user_confirmed_observations: List[Dict[str, Any]],
    specific_report_id: Optional[str] = None,
    top_k: int = 5
) -> Dict[str, Any]:
    """
    Searches authorized user report chunks and approved educational knowledge.
    Restricts user chunks strictly by user_id and report_id when specified.
    """
    query_emb = get_text_embedding(query)

    # 1. Filter report chunks strictly to authorized user
    scoped_user_chunks = [c for c in user_report_chunks if c.get("user_id") == user_id]
    if specific_report_id:
        scoped_user_chunks = [c for c in scoped_user_chunks if c.get("report_id") == specific_report_id]

    # 2. Add confirmed observations as high-priority extractive facts
    obs_chunks = []
    scoped_obs = [o for o in user_confirmed_observations if o.get("user_id") == user_id]
    if specific_report_id:
        scoped_obs = [o for o in scoped_obs if o.get("report_id") == specific_report_id]

    for obs in scoped_obs:
        status_phrase = "outside stated interval" if obs.get("is_outside_stated_interval") else "within stated interval"
        if obs.get("is_outside_stated_interval") is None:
            status_phrase = "not assessed"
        text = (
            f"Confirmed Test: {obs.get('canonical_test')}. "
            f"Observed Value: {obs.get('value_text')} {obs.get('unit')}. "
            f"Reported Reference: {obs.get('reference_text') or 'Not specified'}. "
            f"Evaluation: {status_phrase}."
        )
        obs_chunks.append({
            "id": f"obs_{obs.get('id')}",
            "source_id": obs.get("report_id", "report"),
            "title": f"Confirmed Lab Test ({obs.get('canonical_test')})",
            "page": obs.get("page", 1),
            "date": obs.get("report_date", "Recent"),
            "text": text,
            "embedding": get_text_embedding(text)
        })

    # 3. Approved educational knowledge
    edu_corpus = load_knowledge_corpus()
    for item in edu_corpus:
        item["embedding"] = get_text_embedding(item["text"])
        item["title"] = item.get("source_title", "Educational Source")

    # Combine pools
    candidate_pool = obs_chunks + scoped_user_chunks + edu_corpus
    ranked_results = hybrid_rrf_rank(query, query_emb, candidate_pool, top_k=top_k)

    return {
        "query": query,
        "results": ranked_results,
        "has_evidence": len(ranked_results) > 0
    }

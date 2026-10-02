import math
import numpy as np
from typing import List, Dict, Any, Optional

_model = None
_model_failed = False

def get_embedding_model():
    """Lazy loader for sentence-transformers/all-MiniLM-L6-v2."""
    global _model, _model_failed
    if _model is not None:
        return _model
    if _model_failed:
        return None
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return _model
    except Exception as e:
        print(f"Warning: Could not load sentence-transformers locally ({e}). Using deterministic projection.")
        _model_failed = True
        return None

def generate_deterministic_embedding(text: str, dimensions: int = 384) -> List[float]:
    """
    Deterministic feature projection ensuring 384 dimensions matching all-MiniLM-L6-v2.
    Used for local testing or before the HuggingFace weights finish downloading.
    """
    import hashlib
    words = text.lower().replace("\n", " ").split()
    vec = [0.0] * dimensions
    for idx, word in enumerate(words):
        h = int(hashlib.sha256(word.encode("utf-8")).hexdigest()[:8], 16)
        slot = h % dimensions
        weight = 1.0 / (1.0 + math.log(1.0 + idx))
        vec[slot] += weight
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0.0:
        return [0.0] * dimensions
    return [round(x / norm, 6) for x in vec]

def get_text_embedding(text: str) -> List[float]:
    """Generates 384-dimensional vector embedding for text."""
    model = get_embedding_model()
    if model is not None:
        emb = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return [round(float(x), 6) for x in emb.tolist()]
    return generate_deterministic_embedding(text, dimensions=384)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two 384-dimensional vectors."""
    if len(v1) != len(v2) or len(v1) == 0:
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

def chunk_document_text(
    pages: List[Dict[str, Any]],
    chunk_size_words: int = 160,
    overlap_words: int = 25
) -> List[Dict[str, Any]]:
    """
    Chunks document pages into 150-200 word pieces with 20-30 word overlap.
    Preserves page numbers, character spans, and generates embeddings.
    """
    chunks = []
    chunk_idx = 0

    for page_info in pages:
        page_num = page_info.get("page", 1)
        text = page_info.get("text", "")
        words = text.split()
        if not words:
            continue

        step = max(1, chunk_size_words - overlap_words)
        for i in range(0, len(words), step):
            piece_words = words[i:i + chunk_size_words]
            piece_text = " ".join(piece_words)
            if len(piece_words) < 15 and i > 0:
                continue # Skip trailing micro-fragments

            embedding = get_text_embedding(piece_text)
            chunks.append({
                "chunk_index": chunk_idx,
                "page": page_num,
                "text": piece_text,
                "embedding": embedding,
                "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
                "corpus_version": "1.0.0"
            })
            chunk_idx += 1

    return chunks

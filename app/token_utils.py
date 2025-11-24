from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Any

from app.llama_engine import get_config

try:
    from transformers import AutoTokenizer
except Exception:
    AutoTokenizer = None

_tokenizer: Optional[Any] = None


def get_tokenizer():
    """Return a HuggingFace tokenizer if available, else None."""
    global _tokenizer
    if _tokenizer is not None:
        return _tokenizer

    if AutoTokenizer is None:
        return None

    cfg = get_config()
    emb = cfg.get("rag", {}).get("embedding_model", "all-MiniLM-L6-v2")
    model_path = Path(__file__).resolve().parents[1] / emb

    try:
        if model_path.exists():
            _tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        else:
            _tokenizer = AutoTokenizer.from_pretrained(emb)
    except Exception:
        _tokenizer = None

    return _tokenizer


def encode_text(text: str) -> List[Any]:
    """Encode text into tokens. Returns a list of token ids or fallback words."""
    tok = get_tokenizer()
    if tok is not None:
        return tok.encode(text, add_special_tokens=False)
    # Fallback: simple whitespace split
    return text.split()


def decode_tokens(tokens: List[Any]) -> str:
    """Decode token ids back into text. Accepts either token ids or word lists."""
    tok = get_tokenizer()
    if tok is not None:
        try:
            return tok.decode(tokens, skip_special_tokens=True)
        except Exception:
            # If tokens are not ints, fall through
            pass
    # Fallback: join words
    return " ".join(str(t) for t in tokens)


def count_tokens(text: str) -> int:
    """Return token count for a piece of text."""
    encoded = encode_text(text)
    return len(encoded)

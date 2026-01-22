from __future__ import annotations

import os
import yaml
from pathlib import Path
from typing import Any, Dict, List

try:
    from huggingface_hub import InferenceClient
except Exception:
    InferenceClient = None


def _find_config_paths() -> list[Path]:
    root = Path(__file__).resolve().parents[1]
    candidates = [
        root / "app" / "config" / "rag_config.yaml",
        root / "app" / "config" / "config.yaml",
        root / "config.yaml",
    ]
    return candidates


def get_config() -> Dict[str, Any]:
    """Load config from YAML. Returns a dict."""
    for p in _find_config_paths():
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return yaml.safe_load(f) or {}
            except Exception:
                break
    return {}


def get_system_prompt() -> str:
    cfg = get_config()
    return cfg.get("chat", {}).get("system_prompt", "")


def _init_hf_client():
    if InferenceClient is None:
        return None
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        return None
    try:
        return InferenceClient(api_key=hf_token)
    except Exception:
        return None


_hf_client = None


def _get_hf_client():
    global _hf_client
    if _hf_client is None:
        _hf_client = _init_hf_client()
    return _hf_client


def chat_completion(messages: List[Dict[str, str]], **kwargs) -> str:
    """Call the project's configured LLM via HuggingFace Inference (if available).

    Falls back to returning the last user message if no HF client or token is available.
    """
    if not messages:
        return ""

    client = _get_hf_client()
    # Determine model: prefer env `LLM_MODEL`, otherwise look in config, otherwise default
    cfg = get_config()
    model = os.getenv("LLM_MODEL") or cfg.get("chat", {}).get("model") or "openai/gpt-oss-120b"

    # If we don't have a HF client, fallback to returning last user message
    if client is None:
        for msg in reversed(messages):
            if msg.get("role") == "user":
                return msg.get("content", "")
        return messages[-1].get("content", "")

    # Build generation kwargs
    gen_kwargs = {}
    if "temperature" in kwargs:
        gen_kwargs["temperature"] = kwargs["temperature"]
    if "max_tokens" in kwargs:
        gen_kwargs["max_tokens"] = kwargs["max_tokens"]
    if "top_p" in kwargs:
        gen_kwargs["top_p"] = kwargs["top_p"]

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            **gen_kwargs,
        )
        # Extract assistant message
        try:
            choice = completion.choices[0]
            msg = choice.message
            if isinstance(msg, dict):
                return msg.get("content", "")
            return getattr(msg, "content", str(choice))
        except Exception:
            return str(completion)
    except Exception:
        # On any failure, return last user message as safe fallback
        for msg in reversed(messages):
            if msg.get("role") == "user":
                return msg.get("content", "")
        return messages[-1].get("content", "")


__all__ = ["get_config", "chat_completion", "get_system_prompt"]

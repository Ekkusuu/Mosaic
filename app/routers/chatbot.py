import os
from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from huggingface_hub import InferenceClient
from app.llama_engine import get_config
from app.rag_engine import retrieve_context, format_context_for_prompt

# Expect HF_TOKEN in environment (.env loaded by db module on startup indirectly)
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not set in environment")

# Initialize once (simple sync client)
client = InferenceClient(
    provider="nscale",
    api_key=HF_TOKEN,
)

router = APIRouter()

Role = Literal["user", "assistant", "system"]

class ChatMessage(BaseModel):
    role: Role
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    # Optional: temperature or other generation params later
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512

class ChatResponse(BaseModel):
    reply: str

MODEL_NAME = "openai/gpt-oss-120b"

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    # Load config and decide if RAG should be used for this request
    try:
        cfg = get_config()
        rag_cfg = cfg.get("rag", {})
        use_rag = bool(rag_cfg.get("enabled", False))
    except Exception:
        use_rag = False

    # Prepare messages payload (convert pydantic models to dicts)
    messages_payload = [m.model_dump() for m in req.messages]

    # If RAG is enabled, retrieve context for the last user message and
    # attach formatted context to the system prompt (or create one).
    if use_rag:
        # Find last user message content
        last_user = None
        for m in reversed(messages_payload):
            if m.get("role") == "user":
                last_user = m.get("content")
                break

        if last_user:
            try:
                results = retrieve_context(last_user, top_k=rag_cfg.get("top_k", None))
                contexts = []
                if isinstance(results, dict):
                    contexts = results.get("accepted") or []
                elif isinstance(results, list):
                    contexts = results

                formatted = format_context_for_prompt(contexts) if contexts else ""

                if formatted:
                    # Attach to existing system prompt if present
                    system_found = False
                    for msg in messages_payload:
                        if msg.get("role") == "system":
                            # Append contexts at the end of system message
                            msg["content"] = (msg.get("content", "") + "\n\n" + formatted).strip()
                            system_found = True
                            break

                    if not system_found:
                        # Use configured system prompt as base if available
                        base_sys = cfg.get("chat", {}).get("system_prompt", "")
                        combined = (base_sys + "\n\n" + formatted).strip() if base_sys else formatted
                        messages_payload.insert(0, {"role": "system", "content": combined})
            except Exception as e:
                print(f"RAG retrieval error: {e}")

    # Convert to structure expected by HF client (already matching openai style)
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages_payload,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat backend error: {e}")

    # Extract assistant message (first choice)
    try:
        reply_msg = completion.choices[0].message["content"] if isinstance(completion.choices[0].message, dict) else completion.choices[0].message.content
    except Exception:
        # fallback: stringify
        reply_msg = str(completion)
    return ChatResponse(reply=reply_msg)

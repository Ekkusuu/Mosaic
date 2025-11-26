import os
from typing import List, Literal, Optional, Dict, Any
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
    # contexts returned for client-side display (source name and snippet)
    contexts: Optional[List[Dict[str, Any]]] = None

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

                # Create a contexts payload for the client (source names + text)
                contexts_for_client = []
                for ctx in contexts:
                    contexts_for_client.append({
                        "source": ctx.get("metadata", {}).get("source_file", "unknown"),
                        "text": ctx.get("text", "")
                    })

                # Format the contexts for injection into the system prompt, but omit source names.
                # We deliberately avoid giving the model the source filenames to discourage inline
                # citation generation — the UI will render source names separately.
                ctx_texts = []
                for i, ctx in enumerate(contexts, 1):
                    ctx_texts.append(f"---\n{ctx.get('text', '')}\n")
                formatted = "Relevant context (for reference only):\n\n" + "\n".join(ctx_texts) if contexts else ""

                # Strong instruction to the LLM: do not include inline citations or references
                instruction = (
                    "Use the following retrieved context to inform your answer. "
                    "IMPORTANT: Do NOT include inline citations, footnotes, or references to these documents inside the answer text. "
                    "Do NOT mention source filenames or chunk labels in the body. The client will display source names separately. "
                    "Focus on answering clearly and concisely using the context provided."
                )

                if formatted:
                    # Attach to existing system prompt if present
                    system_found = False
                    for msg in messages_payload:
                        if msg.get("role") == "system":
                            # Append instruction + contexts at the end of system message
                            msg_content = msg.get("content", "")
                            additions = instruction + "\n\n" + formatted
                            msg["content"] = (msg_content + "\n\n" + additions).strip()
                            system_found = True
                            break

                    if not system_found:
                        # Use configured system prompt as base if available
                        base_sys = cfg.get("chat", {}).get("system_prompt", "")
                        combined = (base_sys + "\n\n" + instruction + "\n\n" + formatted).strip() if base_sys else (instruction + "\n\n" + formatted)
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

    # Return contexts_for_client (if available) so the frontend can render a styled references list
    contexts_for_client = locals().get('contexts_for_client')
    return ChatResponse(reply=reply_msg, contexts=contexts_for_client)

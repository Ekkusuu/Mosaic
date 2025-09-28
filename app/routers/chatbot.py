import os
from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from huggingface_hub import InferenceClient

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

    # Convert to structure expected by HF client (already matching openai style)
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[m.model_dump() for m in req.messages],
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

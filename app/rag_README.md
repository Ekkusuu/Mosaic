RAG system (quick start)
=========================

Files added/changed:
- `app/config/rag_config.yaml` — configuration for chat & RAG
- `app/llama_engine.py` — lightweight config loader & chat shim

Indexing uploads and configured folders
--------------------------------------
1. Ensure Python environment has these packages installed (at minimum):

   - `chromadb`
   - `sentence-transformers` (for local embedding & reranker models)

2. To index the folders listed in the config (including `uploads`):

   Open a Windows `cmd.exe` shell in the project root and run:

   ```cmd
   python -c "from app.rag_engine import index_all_folders; print(index_all_folders(clear_existing=False))"
   ```

3. To force a fresh reindex (clear existing documents for the configured folders):

   ```cmd
   python -c "from app.rag_engine import index_all_folders; print(index_all_folders(clear_existing=True))"
   ```

Notes
-----
- The embedding model path is configured in `app/config/rag_config.yaml` as `rag.embedding_model`.
- The reranker model path is configured under `rag.reranker_model`.
- The `app/llama_engine.chat_completion` function is a minimal fallback used for RAG query generation; replace or extend it with a real LLM integration if desired.

Next steps
----------
- If you want me to wire a specific LLM provider (OpenAI, HuggingFace, or a local runner), I can update `app/llama_engine.py` to call it.
- I can also add an HTTP endpoint to trigger indexing from the FastAPI app if you prefer.

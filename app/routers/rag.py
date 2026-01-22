from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query

from app import rag_engine

router = APIRouter()


@router.post("/index")
def trigger_index(clear: Optional[bool] = Query(False), folder: Optional[str] = Query(None)) -> Dict[str, Any]:
    """Trigger indexing. If `folder` is provided, index that folder only.
    Use `clear=true` to clear existing documents for that folder(s).
    """
    try:
        if folder:
            count = rag_engine.index_folder(folder, clear_existing=bool(clear))
            return {"indexed_chunks": count, "folder": folder}
        else:
            results = rag_engine.index_all_folders(clear_existing=bool(clear))
            return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def rag_status() -> Dict[str, Any]:
    """Return simple RAG index status: collection count and tracked files."""
    try:
        collection = rag_engine.get_collection()
        count = 0
        try:
            count = collection.count()
        except Exception:
            # Some Chroma versions expose different APIs
            try:
                count = len(collection.get("ids") or [])
            except Exception:
                count = 0

        file_meta = rag_engine.load_file_metadata()
        return {
            "collection_count": int(count),
            "tracked_files": len(file_meta),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""Documents upload router for adding files to the RAG knowledge base and generating architectures."""

import io
import json
import re
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/documents", tags=["documents"])

# Singleton services
_rag_service = None
_architecture_service = None
_gemini_service = None


def _get_rag_service():
    global _rag_service
    if _rag_service is None:
        from app.services.rag_service import RAGService
        _rag_service = RAGService()
    return _rag_service


def _get_architecture_service():
    global _architecture_service
    if _architecture_service is None:
        from app.services.architecture_service import ArchitectureService
        _architecture_service = ArchitectureService()
    return _architecture_service


def _get_gemini_service():
    global _gemini_service
    if _gemini_service is None:
        from app.services.gemini_service import GeminiService
        _gemini_service = GeminiService()
    return _gemini_service


# --- Response models ---

class UploadResponse(BaseModel):
    filename: str
    chunks_added: int
    status: str


class CanvasResponse(BaseModel):
    filename: str
    components_found: list[str]
    architecture: dict
    status: str


# --- File parsers ---

def _extract_text_from_pdf(file_bytes: bytes) -> str:
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


def _extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}


def _get_extension(filename: str) -> str:
    filename_lower = filename.lower()
    return "." + filename_lower.rsplit(".", 1)[-1] if "." in filename_lower else ""


async def _read_and_extract(file: UploadFile) -> tuple[str, str]:
    """Read file and extract text. Returns (text, extension)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    extension = _get_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty.")

    try:
        if extension == ".pdf":
            text = _extract_text_from_pdf(file_bytes)
        elif extension in (".docx", ".doc"):
            text = _extract_text_from_docx(file_bytes)
        elif extension == ".txt":
            text = _extract_text_from_txt(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file.")

    return text, extension


# --- Endpoints ---

@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document to add to the AI knowledge base (RAG)."""
    text, _ = await _read_and_extract(file)

    try:
        rag = _get_rag_service()
        chunks_added = rag.add_documents(text, source=file.filename)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    print(f"✅ Uploaded '{file.filename}': {chunks_added} chunks added to knowledge base.")
    return UploadResponse(filename=file.filename, chunks_added=chunks_added, status="success")


@router.post("/upload-to-canvas", response_model=CanvasResponse)
async def upload_to_canvas(file: UploadFile = File(...)):
    """
    Upload a document, analyze it with Gemini, and generate an architecture diagram.
    
    The document text is sent to Gemini along with the full component library.
    Gemini identifies which components are described or implied in the document,
    and the ArchitectureService generates the positioned node/edge diagram.
    """
    text, _ = await _read_and_extract(file)

    # Build the component catalog for the prompt
    from app.data.components_data import COMPONENT_LIBRARY
    component_catalog = []
    for cat in COMPONENT_LIBRARY:
        for comp in cat.components:
            component_catalog.append(f"  - id: \"{comp.id}\", name: \"{comp.name}\", category: \"{cat.id}\"")
    catalog_str = "\n".join(component_catalog)

    # Truncate document text to avoid exceeding token limits
    max_chars = 8000
    doc_text = text[:max_chars] + ("..." if len(text) > max_chars else "")

    prompt = f"""Analyze the following document and identify which software/infrastructure components are described, mentioned, or implied in the architecture.

Match them ONLY to components from this catalog. Return a JSON array of matching component IDs.

COMPONENT CATALOG:
{catalog_str}

DOCUMENT:
\"\"\"
{doc_text}
\"\"\"

Rules:
1. Only return IDs that exist in the catalog above.
2. If a technology is mentioned that closely matches a catalog component, include it.
3. If no exact match exists, pick the closest alternative from the catalog.
4. Include infrastructure components (hosting, database, cache, etc.) if implied.
5. Return ONLY a valid JSON array of strings, nothing else. Example: ["react", "fastapi", "postgresql"]

JSON array:"""

    # Call Gemini
    try:
        gemini = _get_gemini_service()
        response_text = gemini.generate_response(user_message=prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {str(e)}")

    # Parse component IDs from Gemini response
    component_ids = _parse_component_ids(response_text)

    if not component_ids:
        raise HTTPException(
            status_code=422,
            detail="Could not identify any architecture components in the document. "
                   "Try uploading a document that describes a software system or tech stack."
        )

    # Validate against actual component library
    valid_ids = set()
    for cat in COMPONENT_LIBRARY:
        for comp in cat.components:
            valid_ids.add(comp.id)
    component_ids = [cid for cid in component_ids if cid in valid_ids]

    if not component_ids:
        raise HTTPException(
            status_code=422,
            detail="Gemini returned component names that don't match the library. Please try again."
        )

    # Generate architecture using existing service
    try:
        arch_service = _get_architecture_service()
        from app.models.architecture import Scope
        architecture = arch_service.generate_architecture_from_components(
            component_ids=component_ids,
            scope=Scope()
        )
        arch_dict = architecture.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Architecture generation failed: {str(e)}")

    print(f"🎨 Generated architecture from '{file.filename}': {component_ids}")

    return CanvasResponse(
        filename=file.filename,
        components_found=component_ids,
        architecture=arch_dict,
        status="success"
    )


def _parse_component_ids(response_text: str) -> list[str]:
    """Extract a JSON array of component IDs from Gemini's response."""
    # Try to find a JSON array in the response
    # Pattern 1: Direct JSON array
    json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, list):
                return [str(item).strip().lower() for item in parsed if isinstance(item, str)]
        except json.JSONDecodeError:
            pass
    
    # Pattern 2: Code block containing JSON
    code_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response_text, re.DOTALL)
    if code_match:
        try:
            parsed = json.loads(code_match.group(1))
            if isinstance(parsed, list):
                return [str(item).strip().lower() for item in parsed if isinstance(item, str)]
        except json.JSONDecodeError:
            pass

    return []

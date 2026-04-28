"""
Vulcan Model Registry — Multi-Provider LLM Management API
"""

import asyncio
import threading
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/models", tags=["models"])

# ─── In-Memory Store ───────────────────────────────────────────────────────────

class ModelConfig(BaseModel):
    id: str
    name: str
    provider: str  # anthropic | openai | ollama | azure | custom | google | deepseek | groq | mistral
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    default_model: Optional[str] = None
    enabled: bool = True
    priority: int = 1
    max_tokens: Optional[int] = None
    temperature: float = 0.7
    latency_ms: Optional[int] = None  # 0 = untested, >0 = last ping
    status: str = "unknown"  # unknown | online | offline | error

class ModelTestRequest(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None

class ModelTestResponse(BaseModel):
    success: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    model: Optional[str] = None

# Thread-safe in-memory registry
_models: dict[str, ModelConfig] = {}
_lock = threading.Lock()

DEFAULT_MODELS = [
    ModelConfig(
        id="anthropic-default",
        name="Claude (Anthropic)",
        provider="anthropic",
        default_model="claude-sonnet-4-5",
        enabled=True,
        priority=1,
        temperature=0.7,
        status="online",
        latency_ms=180,
    ),
    ModelConfig(
        id="openai-default",
        name="OpenAI GPT-4o",
        provider="openai",
        default_model="gpt-4o",
        enabled=True,
        priority=2,
        temperature=0.7,
        status="online",
        latency_ms=210,
    ),
    ModelConfig(
        id="google-default",
        name="Google Gemini",
        provider="google",
        default_model="gemini-2.0-flash",
        enabled=True,
        priority=3,
        temperature=0.7,
        status="online",
        latency_ms=250,
    ),
    ModelConfig(
        id="ollama-local",
        name="Ollama (本地)",
        provider="ollama",
        base_url="http://localhost:11434",
        default_model="llama3.2",
        enabled=False,
        priority=4,
        temperature=0.8,
        status="offline",
        latency_ms=None,
    ),
    ModelConfig(
        id="deepseek-default",
        name="DeepSeek V3",
        provider="deepseek",
        base_url="https://api.deepseek.com",
        default_model="deepseek-chat",
        enabled=False,
        priority=5,
        temperature=0.7,
        status="offline",
        latency_ms=None,
    ),
]

with _lock:
    for m in DEFAULT_MODELS:
        _models[m.id] = m

# ─── Connectivity Test ─────────────────────────────────────────────────────────

async def _test_provider(config: ModelTestRequest) -> ModelTestResponse:
    """Test connectivity to a provider endpoint."""
    import time
    start = time.monotonic()
    
    try:
        if config.provider == "ollama":
            import httpx
            url = (config.base_url or "http://localhost:11434").rstrip("/")
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{url}/api/tags")
                if resp.status_code == 200:
                    models = resp.json().get("models", [])
                    default_model = config.model or (models[0]["name"] if models else "unknown")
                    return ModelTestResponse(
                        success=True,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        model=default_model,
                    )
                else:
                    return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "anthropic":
            if not config.api_key:
                return ModelTestResponse(success=False, error="API key required")
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": config.api_key,
                        "anthropic-version": "2023-06-01",
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("data", [])
                    default_model = config.model or (models[0]["id"] if models else "claude-sonnet-4")
                    return ModelTestResponse(
                        success=True,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        model=default_model,
                    )
                elif resp.status_code == 401:
                    return ModelTestResponse(success=False, error="Invalid API key")
                else:
                    return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "openai":
            if not config.api_key:
                return ModelTestResponse(success=False, error="API key required")
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                base = config.base_url or "https://api.openai.com"
                resp = await client.get(
                    f"{base}/v1/models",
                    headers={"Authorization": f"Bearer {config.api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    gpt_models = [m["id"] for m in data.get("data", []) if "gpt" in m["id"].lower()]
                    default_model = config.model or (gpt_models[0] if gpt_models else "gpt-4o")
                    return ModelTestResponse(
                        success=True,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        model=default_model,
                    )
                elif resp.status_code == 401:
                    return ModelTestResponse(success=False, error="Invalid API key")
                else:
                    return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "google":
            if not config.api_key:
                return ModelTestResponse(success=False, error="API key required")
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={config.api_key}"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models", [])
                    default_model = config.model or (models[0]["name"] if models else "gemini-2.0-flash")
                    return ModelTestResponse(
                        success=True,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        model=default_model,
                    )
                else:
                    return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "deepseek":
            if not config.api_key:
                return ModelTestResponse(success=False, error="API key required")
            import httpx
            base = config.base_url or "https://api.deepseek.com"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{base}/chat/completions",
                    headers={"Authorization": f"Bearer {config.api_key}"},
                    json={"model": config.model or "deepseek-chat", "messages": [{"role":"user","content":"hi"}], "max_tokens": 5},
                )
                if resp.status_code == 200:
                    return ModelTestResponse(
                        success=True,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        model=config.model or "deepseek-chat",
                    )
                elif resp.status_code == 401:
                    return ModelTestResponse(success=False, error="Invalid API key")
                else:
                    return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "azure":
            if not config.base_url or not config.api_key:
                return ModelTestResponse(success=False, error="Azure requires base_url and api_key")
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(config.base_url, headers={"api-key": config.api_key})
                if resp.status_code in (200, 401, 403):
                    return ModelTestResponse(success=True, latency_ms=int((time.monotonic() - start) * 1000))
                return ModelTestResponse(success=False, error=f"HTTP {resp.status_code}")
        
        elif config.provider == "custom":
            if not config.base_url:
                return ModelTestResponse(success=False, error="Custom provider requires base_url")
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(config.base_url)
                return ModelTestResponse(
                    success=(resp.status_code < 500),
                    latency_ms=int((time.monotonic() - start) * 1000),
                    error=None if resp.status_code < 500 else f"HTTP {resp.status_code}",
                )
        
        else:
            return ModelTestResponse(success=False, error=f"Provider '{config.provider}' not supported for test")
    
    except asyncio.TimeoutError:
        return ModelTestResponse(success=False, error="Connection timeout (10s)")
    except Exception as e:
        return ModelTestResponse(success=False, error=str(e))


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ModelConfig])
def list_models():
    """List all configured models."""
    with _lock:
        return list(_models.values())

@router.get("/{model_id}", response_model=ModelConfig)
def get_model(model_id: str):
    """Get a specific model config."""
    with _lock:
        if model_id not in _models:
            raise HTTPException(404, f"Model '{model_id}' not found")
        return _models[model_id]

@router.post("/", response_model=ModelConfig)
def add_model(model: ModelConfig):
    """Add a new model configuration."""
    with _lock:
        if model.id in _models:
            raise HTTPException(409, f"Model '{model.id}' already exists")
        _models[model.id] = model
    return model

@router.put("/{model_id}", response_model=ModelConfig)
def update_model(model_id: str, model: ModelConfig):
    """Update a model configuration."""
    with _lock:
        if model_id not in _models:
            raise HTTPException(404, f"Model '{model_id}' not found")
        _models[model_id] = model
    return model

@router.delete("/{model_id}")
def delete_model(model_id: str):
    """Delete a model configuration."""
    with _lock:
        if model_id not in _models:
            raise HTTPException(404, f"Model '{model_id}' not found")
        del _models[model_id]
    return {"ok": True}

@router.post("/test", response_model=ModelTestResponse)
async def test_connection(req: ModelTestRequest):
    """Test connectivity to a provider without saving."""
    return await _test_provider(req)

@router.post("/{model_id}/test", response_model=ModelTestResponse)
async def test_model(model_id: str):
    """Test connectivity for a saved model."""
    with _lock:
        if model_id not in _models:
            raise HTTPException(404, f"Model '{model_id}' not found")
        config = _models[model_id]
    
    result = await _test_provider(ModelTestRequest(
        provider=config.provider,
        base_url=config.base_url,
        api_key=config.api_key,
        model=config.default_model,
    ))
    
    # Update latency and status
    with _lock:
        if model_id in _models:
            _models[model_id].latency_ms = result.latency_ms
            _models[model_id].status = "online" if result.success else "error"
    
    return result

@router.post("/{model_id}/toggle")
def toggle_model(model_id: str, enabled: bool):
    """Enable or disable a model."""
    with _lock:
        if model_id not in _models:
            raise HTTPException(404, f"Model '{model_id}' not found")
        _models[model_id].enabled = enabled
    return {"ok": True, "enabled": enabled}

@router.get("/providers/list")
def list_providers():
    """List supported providers with their status."""
    with _lock:
        providers = {}
        for m in _models.values():
            if m.provider not in providers:
                providers[m.provider] = {"enabled": 0, "total": 0, "online": 0}
            providers[m.provider]["total"] += 1
            if m.enabled:
                providers[m.provider]["enabled"] += 1
            if m.status == "online":
                providers[m.provider]["online"] += 1
        return providers

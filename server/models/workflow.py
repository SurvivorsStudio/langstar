from pydantic import BaseModel
from typing import Dict, Any, List

class PromptNodeInput(BaseModel):
    prompt: str
    param: Dict[str, Any]
    return_key: str

class AgentNodeInput(BaseModel):
    input: str
    return_key: str 
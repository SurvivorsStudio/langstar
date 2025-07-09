from pydantic import BaseModel
from typing import Dict, Any, List
from typing import Dict, Any, Optional

class PromptNodeInput(BaseModel):
    prompt: str
    param: Dict[str, Any]
    return_key: str

class AgentNodeInput(BaseModel):
    input: str
    return_key: str 



class FlowerRequest(BaseModel):
    flower_id: str
    input_data: Dict[str, Any]
    config: Optional[Dict[str, Any]] = None

class FlowerResponse(BaseModel):
    flower_id: str
    result: Any
    status: str

class FlowerListResponse(BaseModel):
    available_flowers: list[str]

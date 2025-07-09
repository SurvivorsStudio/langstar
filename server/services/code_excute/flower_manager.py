from pydantic import BaseModel
from langgraph.graph import StateGraph
from typing import Dict, Any, Optional
import importlib.util
import os
import json
from pathlib import Path
import importlib.util
import sys
from pathlib import Path
from typing import Dict
from langgraph.graph import StateGraph
from fastapi import HTTPException




class FlowerManager:
    def __init__(self, flowers_directory: str = "./server/services/code_excute/deploy_model_list"):
        self.flowers_directory = Path(flowers_directory)
        self.loaded_flowers: Dict[str, StateGraph] = {}
        self.flower_metadata: Dict[str, Dict] = {}
        self.loaded_modules: Dict[str, object] = {}

    def scan_flowers(self):
        """flowers 디렉토리 내 사용 가능한 flower 이름 목록 반환"""
        if not self.flowers_directory.exists():
            return []
        return [
            file_path.stem
            for file_path in self.flowers_directory.glob("*.py")
            if not file_path.name.startswith("__")
        ]

    def load_flower(self, flower_id: str) -> StateGraph:
        """flower 모듈을 한 번만 로드해서 graph 객체 반환"""
        if flower_id in self.loaded_flowers:
            return self.loaded_flowers[flower_id]

        flower_path = self.flowers_directory / f"{flower_id}.py"
        if not flower_path.exists():
            raise ValueError(f"Flower '{flower_id}' not found")

        if flower_id in self.loaded_modules:
            module = self.loaded_modules[flower_id]
        else:
            spec = importlib.util.spec_from_file_location(flower_id, flower_path)
            module = importlib.util.module_from_spec(spec)
            sys.modules[flower_id] = module
            spec.loader.exec_module(module)
            self.loaded_modules[flower_id] = module

        # graph는 모듈 안에서 미리 생성된 객체를 가져오기만 함
        if hasattr(module, "graph"):
            graph = module.graph
        elif hasattr(module, "create_graph"):
            graph = module.create_graph()
        else:
            raise ValueError(f"Flower '{flower_id}' must have 'graph' or 'create_graph'")

        # 메타데이터 (없으면 빈 dict)
        self.flower_metadata[flower_id] = getattr(module, "METADATA", {})

        self.loaded_flowers[flower_id] = graph
        return graph

    def reload_flower(self, flower_id: str) -> StateGraph:
        """flower 강제 재로딩 (캐시 및 sys.modules 모두 초기화)"""
        self.loaded_flowers.pop(flower_id, None)
        self.flower_metadata.pop(flower_id, None)
        self.loaded_modules.pop(flower_id, None)
        sys.modules.pop(flower_id, None)
        return self.load_flower(flower_id)

    def get_metadata(self, flower_id: str) -> Dict:
        """flower 메타데이터 반환"""
        return self.flower_metadata.get(flower_id, {})
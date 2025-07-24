from pydantic import BaseModel
from langgraph.graph import StateGraph
from typing import Dict, Any, Optional, List
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
import tempfile
import logging

# 로거 설정
logger = logging.getLogger(__name__)

class FlowerManager:
    def __init__(self, flowers_directory: str = "./server/services/code_excute/deploy_model_list"):
        self.flowers_directory = Path(flowers_directory)
        self.loaded_flowers: Dict[str, StateGraph] = {}
        self.flower_metadata: Dict[str, Dict] = {}
        self.loaded_modules: Dict[str, object] = {}
        
        # 배포 관련 추가 속성
        self.deployments: Dict[str, Dict[str, Any]] = {}
        self.deployment_modules: Dict[str, object] = {}
        self.deployment_apps: Dict[str, Any] = {}

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

    # 배포 관련 메서드들
    def register_deployment(self, deployment_id: str, code: str) -> bool:
        """배포 코드를 동적으로 등록합니다."""
        try:
            logger.info(f"Registering deployment: {deployment_id}")
            
            # 1. 임시 파일에 코드 저장
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False)
            temp_file.write(code)
            temp_file.close()
            
            # 2. 모듈명 생성
            module_name = f"deployment_{deployment_id.replace('-', '_')}"
            
            # 3. 모듈 로드
            spec = importlib.util.spec_from_file_location(module_name, temp_file.name)
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            # 4. 배포 정보 저장
            self.deployments[deployment_id] = {
                "module_name": module_name,
                "file_path": temp_file.name,
                "code": code
            }
            self.deployment_modules[deployment_id] = module
            
            # 5. app 객체 추출
            if hasattr(module, "app"):
                self.deployment_apps[deployment_id] = module.app
            else:
                raise ValueError(f"Deployment {deployment_id} must have 'app' object")
            
            logger.info(f"Successfully registered deployment: {deployment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering deployment {deployment_id}: {str(e)}")
            # 임시 파일 정리
            if 'temp_file' in locals():
                os.unlink(temp_file.name)
            raise

    def run_deployment(self, deployment_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """배포를 실행합니다."""
        try:
            if deployment_id not in self.deployments:
                raise ValueError(f"Deployment {deployment_id} not registered")
            
            if deployment_id not in self.deployment_apps:
                raise ValueError(f"Deployment {deployment_id} app not loaded")
            
            app = self.deployment_apps[deployment_id]
            
            # 배포 실행
            result = app.invoke(input_data, {"configurable": {"thread_id": 1}})
            
            return {
                "success": True,
                "deployment_id": deployment_id,
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Error running deployment {deployment_id}: {str(e)}")
            return {
                "success": False,
                "deployment_id": deployment_id,
                "error": str(e)
            }

    def unregister_deployment(self, deployment_id: str) -> bool:
        """배포를 등록 해제합니다."""
        try:
            if deployment_id in self.deployments:
                # 임시 파일 삭제
                file_path = self.deployments[deployment_id]["file_path"]
                if os.path.exists(file_path):
                    os.unlink(file_path)
                
                # 모듈 제거
                module_name = self.deployments[deployment_id]["module_name"]
                sys.modules.pop(module_name, None)
                
                # 캐시 정리
                self.deployments.pop(deployment_id, None)
                self.deployment_modules.pop(deployment_id, None)
                self.deployment_apps.pop(deployment_id, None)
                
                logger.info(f"Successfully unregistered deployment: {deployment_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error unregistering deployment {deployment_id}: {str(e)}")
            return False

    def get_deployment_info(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """배포 정보를 반환합니다."""
        return self.deployments.get(deployment_id)

    def list_deployments(self) -> List[str]:
        """등록된 배포 목록을 반환합니다."""
        return list(self.deployments.keys())
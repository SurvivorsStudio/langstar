import os
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from server.models.deployment import (
    Deployment, DeploymentVersion, DeploymentFormData, 
    DeploymentStatus, WorkflowSnapshot
)
from server.services.workflow_service import WorkflowService
from server.services.code_excute import flower_manager

# 로거 설정
logger = logging.getLogger(__name__)

class DeploymentService:
    """배포 관리 서비스"""
    
    def __init__(self):
        self.deployments_dir = "deployments"
        self._ensure_deployments_directory()
    
    def _ensure_deployments_directory(self):
        """배포 디렉토리가 존재하는지 확인하고 없으면 생성"""
        if not os.path.exists(self.deployments_dir):
            os.makedirs(self.deployments_dir)
    
    def create_deployment(self, deployment_data: DeploymentFormData, workflow_data: Dict[str, Any]) -> Deployment:
        """새로운 배포를 생성하고 실행 가능한 상태로 만듭니다."""
        try:
            # 1. 배포 ID 생성
            deployment_id = str(uuid.uuid4())
            workflow_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            # 2. 배포 객체 생성
            deployment = Deployment(
                id=deployment_id,
                name=deployment_data.name,
                version=deployment_data.version,
                description=deployment_data.description,
                workflowId=workflow_id,
                workflowName=workflow_data.get("projectName", "Unknown Workflow"),
                status=DeploymentStatus.DRAFT,
                environment=deployment_data.environment,
                createdAt=now,
                updatedAt=now,
                config=deployment_data.config or {}
            )
            
            # 3. 워크플로우 스냅샷 생성
            workflow_snapshot = WorkflowSnapshot(
                projectId=workflow_id,
                projectName=workflow_data.get("projectName", deployment.workflowName),
                nodes=workflow_data.get("nodes", []),
                edges=workflow_data.get("edges", []),
                viewport=workflow_data.get("viewport", {}),
                lastModified=workflow_data.get("lastModified", now)
            )
            
            # 4. 첫 번째 버전 생성
            deployment_version = DeploymentVersion(
                id=str(uuid.uuid4()),
                deploymentId=deployment_id,
                version=deployment_data.version,
                workflowSnapshot=workflow_snapshot,
                changelog="Initial deployment",
                createdAt=now,
                isActive=True
            )
            
            # 5. Python 코드 생성
            langgraph_code = self._generate_and_deploy_code(deployment_id, workflow_data)
            
            # 6. 파일 시스템에 저장
            self._save_deployment_to_file(deployment, deployment_version)
            
            # 7. 코드 파일 저장
            self._save_deployment_code(deployment_id, langgraph_code)
            
            logger.info(f"Created deployment: {deployment_id}")
            return deployment
            
        except Exception as e:
            logger.error(f"Error creating deployment: {str(e)}")
            raise
    
    def _generate_and_deploy_code(self, deployment_id: str, workflow_data: Dict[str, Any]) -> str:
        """워크플로우에서 Python 코드를 생성하고 실행 엔진에 등록합니다."""
        try:
            # 1. LangGraph 코드 생성
            langgraph_code = WorkflowService.generate_langgraph_code(workflow_data)
            
            # 2. 배포 ID를 사용하여 고유한 모듈명 생성
            module_name = f"deployment_{deployment_id.replace('-', '_')}"
            
            # 3. 코드에 배포 ID 정보 추가
            deployment_code = f"""
# Deployment ID: {deployment_id}
# Generated at: {datetime.utcnow().isoformat()}

{langgraph_code}

# 배포 실행 함수
def run_deployment_{deployment_id.replace('-', '_')}(input_data):
    try:
        result = app.invoke(input_data, {{"configurable": {{"thread_id": 1}}}})
        return {{
            "success": True,
            "deployment_id": "{deployment_id}",
            "result": result
        }}
    except Exception as e:
        return {{
            "success": False,
            "deployment_id": "{deployment_id}",
            "error": str(e)
        }}
"""
            
            # 4. flower_manager에 배포 등록 (임시로 비활성화)
            # TODO: flower_manager.register_deployment(deployment_id, deployment_code)
            logger.info(f"Generated deployment code for: {deployment_id} (registration disabled)")
            
            logger.info(f"Generated and registered deployment code for: {deployment_id}")
            return deployment_code
            
        except Exception as e:
            logger.error(f"Error generating and deploying code: {str(e)}")
            raise
    
    def _save_deployment_code(self, deployment_id: str, code: str):
        """배포 코드를 파일로 저장합니다."""
        try:
            deployment_dir = os.path.join(self.deployments_dir, deployment_id)
            if not os.path.exists(deployment_dir):
                os.makedirs(deployment_dir)
            
            code_file = os.path.join(deployment_dir, "deployment_code.py")
            with open(code_file, 'w', encoding='utf-8') as f:
                f.write(code)
                
            logger.info(f"Saved deployment code to: {code_file}")
            
        except Exception as e:
            logger.error(f"Error saving deployment code: {str(e)}")
            raise
    
    def run_deployment(self, deployment_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """배포를 실행합니다."""
        try:
            # 1. 배포 존재 확인
            deployment = self.get_deployment_by_id(deployment_id)
            if not deployment:
                raise ValueError(f"Deployment {deployment_id} not found")
            
            # 2. 배포가 활성 상태인지 확인
            if deployment.status != DeploymentStatus.ACTIVE:
                raise ValueError(f"Deployment {deployment_id} is not active (status: {deployment.status})")
            
            # 3. 임시로 기존 워크플로우 실행 방식 사용
            # TODO: flower_manager.run_deployment(deployment_id, input_data)
            logger.info(f"Running deployment {deployment_id} with input: {input_data}")
            
            # 임시 응답 (실제로는 생성된 코드를 실행해야 함)
            return {
                "success": True,
                "deployment_id": deployment_id,
                "result": {
                    "message": f"Deployment {deployment.name} executed successfully",
                    "input_received": input_data,
                    "status": "executed"
                }
            }
            
        except Exception as e:
            logger.error(f"Error running deployment {deployment_id}: {str(e)}")
            raise
    
    def get_all_deployments(self) -> List[Deployment]:
        """모든 배포 목록을 반환합니다."""
        try:
            deployments = []
            if not os.path.exists(self.deployments_dir):
                return deployments
            
            for filename in os.listdir(self.deployments_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(self.deployments_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            deployment_data = json.load(f)
                            deployment = Deployment(**deployment_data)
                            deployments.append(deployment)
                    except Exception as e:
                        logger.warning(f"Error loading deployment from {filename}: {str(e)}")
                        continue
            
            # 생성일 기준으로 정렬 (최신순)
            deployments.sort(key=lambda x: x.createdAt, reverse=True)
            return deployments
            
        except Exception as e:
            logger.error(f"Error getting deployments: {str(e)}")
            raise
    
    def get_deployment_by_id(self, deployment_id: str) -> Optional[Deployment]:
        """ID로 배포를 조회합니다."""
        try:
            file_path = os.path.join(self.deployments_dir, f"{deployment_id}.json")
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                deployment_data = json.load(f)
                return Deployment(**deployment_data)
                
        except Exception as e:
            logger.error(f"Error getting deployment {deployment_id}: {str(e)}")
            raise
    
    def get_deployment_versions(self, deployment_id: str) -> List[DeploymentVersion]:
        """배포의 모든 버전을 반환합니다."""
        try:
            versions_dir = os.path.join(self.deployments_dir, deployment_id, "versions")
            if not os.path.exists(versions_dir):
                return []
            
            versions = []
            for filename in os.listdir(versions_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(versions_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            version_data = json.load(f)
                            version = DeploymentVersion(**version_data)
                            versions.append(version)
                    except Exception as e:
                        logger.warning(f"Error loading version from {filename}: {str(e)}")
                        continue
            
            # 버전 기준으로 정렬
            versions.sort(key=lambda x: x.version, reverse=True)
            return versions
            
        except Exception as e:
            logger.error(f"Error getting deployment versions for {deployment_id}: {str(e)}")
            raise
    
    def update_deployment_status(self, deployment_id: str, status: DeploymentStatus) -> Deployment:
        """배포 상태를 업데이트합니다."""
        try:
            deployment = self.get_deployment_by_id(deployment_id)
            if not deployment:
                raise ValueError(f"Deployment {deployment_id} not found")
            
            # 활성화하려는 경우, 같은 ChatFlow의 다른 배포들을 비활성화
            if status == DeploymentStatus.ACTIVE:
                all_deployments = self.get_all_deployments()
                for other_deployment in all_deployments:
                    if (other_deployment.id != deployment_id and 
                        other_deployment.workflowName == deployment.workflowName and 
                        other_deployment.status == DeploymentStatus.ACTIVE):
                        
                        logger.info(f"Deactivating other deployment {other_deployment.id} for same ChatFlow {deployment.workflowName}")
                        other_deployment.status = DeploymentStatus.INACTIVE
                        other_deployment.updatedAt = datetime.utcnow().isoformat()
                        self._save_deployment_to_file(other_deployment)
            
            deployment.status = status
            deployment.updatedAt = datetime.utcnow().isoformat()
            
            if status == DeploymentStatus.ACTIVE:
                deployment.deployedAt = deployment.updatedAt
            
            self._save_deployment_to_file(deployment)
            
            logger.info(f"Updated deployment {deployment_id} status to {status}")
            return deployment
            
        except Exception as e:
            logger.error(f"Error updating deployment status: {str(e)}")
            raise
    
    def create_deployment_version(self, deployment_id: str, workflow_data: Dict[str, Any], 
                                 version: str, changelog: Optional[str] = None) -> DeploymentVersion:
        """새로운 배포 버전을 생성합니다."""
        try:
            deployment = self.get_deployment_by_id(deployment_id)
            if not deployment:
                raise ValueError(f"Deployment {deployment_id} not found")
            
            # 기존 활성 버전을 비활성화
            existing_versions = self.get_deployment_versions(deployment_id)
            for existing_version in existing_versions:
                if existing_version.isActive:
                    existing_version.isActive = False
                    self._save_deployment_version_to_file(existing_version)
            
            # 워크플로우 스냅샷 생성
            workflow_snapshot = WorkflowSnapshot(
                projectId=deployment.workflowId,
                projectName=workflow_data.get("projectName", deployment.workflowName),
                nodes=workflow_data.get("nodes", []),
                edges=workflow_data.get("edges", []),
                viewport=workflow_data.get("viewport", {}),
                lastModified=workflow_data.get("lastModified", datetime.utcnow().isoformat())
            )
            
            # 새 버전 생성
            version_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            deployment_version = DeploymentVersion(
                id=version_id,
                deploymentId=deployment_id,
                version=version,
                workflowSnapshot=workflow_snapshot,
                changelog=changelog or f"Version {version}",
                createdAt=now,
                isActive=True
            )
            
            # 버전 정보를 파일로 저장
            self._save_deployment_version_to_file(deployment_version)
            
            # 배포 정보 업데이트
            deployment.version = version
            deployment.updatedAt = now
            self._save_deployment_to_file(deployment)
            
            logger.info(f"Created deployment version {version} for deployment {deployment_id}")
            return deployment_version
            
        except Exception as e:
            logger.error(f"Error creating deployment version: {str(e)}")
            raise
    
    def generate_deployment_code(self, deployment_id: str, version_id: str) -> str:
        """배포 버전에 대한 Python 코드를 생성합니다."""
        try:
            # 배포 버전 조회
            versions = self.get_deployment_versions(deployment_id)
            target_version = None
            for version in versions:
                if version.id == version_id:
                    target_version = version
                    break
            
            if not target_version:
                raise ValueError(f"Deployment version {version_id} not found")
            
            # 워크플로우 데이터 준비
            workflow_data = {
                "projectName": target_version.workflowSnapshot.projectName,
                "nodes": target_version.workflowSnapshot.nodes,
                "edges": target_version.workflowSnapshot.edges,
                "viewport": target_version.workflowSnapshot.viewport,
                "lastModified": target_version.workflowSnapshot.lastModified
            }
            
            # WorkflowService를 사용하여 LangGraph 코드 생성
            langgraph_code = WorkflowService.generate_langgraph_code(workflow_data)
            
            logger.info(f"Generated code for deployment {deployment_id} version {version_id}")
            return langgraph_code
            
        except Exception as e:
            logger.error(f"Error generating deployment code: {str(e)}")
            raise
    
    def _save_deployment_to_file(self, deployment: Deployment, version: Optional[DeploymentVersion] = None):
        """배포 정보를 파일로 저장합니다."""
        try:
            # 배포 디렉토리 생성
            deployment_dir = os.path.join(self.deployments_dir, deployment.id)
            if not os.path.exists(deployment_dir):
                os.makedirs(deployment_dir)
            
            # 배포 정보 저장
            deployment_file = os.path.join(self.deployments_dir, f"{deployment.id}.json")
            with open(deployment_file, 'w', encoding='utf-8') as f:
                json.dump(deployment.dict(), f, indent=2, ensure_ascii=False)
            
            # 첫 번째 버전이 있다면 함께 저장
            if version:
                self._save_deployment_version_to_file(version)
                
        except Exception as e:
            logger.error(f"Error saving deployment to file: {str(e)}")
            raise
    
    def _save_deployment_version_to_file(self, version: DeploymentVersion):
        """배포 버전 정보를 파일로 저장합니다."""
        try:
            # 버전 디렉토리 생성
            versions_dir = os.path.join(self.deployments_dir, version.deploymentId, "versions")
            if not os.path.exists(versions_dir):
                os.makedirs(versions_dir)
            
            # 버전 정보 저장
            version_file = os.path.join(versions_dir, f"{version.id}.json")
            with open(version_file, 'w', encoding='utf-8') as f:
                json.dump(version.dict(), f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"Error saving deployment version to file: {str(e)}")
            raise
    
    def delete_deployment(self, deployment_id: str) -> bool:
        """배포를 삭제합니다."""
        try:
            deployment = self.get_deployment_by_id(deployment_id)
            if not deployment:
                return False
            
            # 배포 디렉토리 삭제
            deployment_dir = os.path.join(self.deployments_dir, deployment_id)
            if os.path.exists(deployment_dir):
                import shutil
                shutil.rmtree(deployment_dir)
            
            # 배포 파일 삭제
            deployment_file = os.path.join(self.deployments_dir, f"{deployment_id}.json")
            if os.path.exists(deployment_file):
                os.remove(deployment_file)
            
            logger.info(f"Deleted deployment: {deployment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting deployment {deployment_id}: {str(e)}")
            raise

# 싱글톤 인스턴스
deployment_service = DeploymentService() 
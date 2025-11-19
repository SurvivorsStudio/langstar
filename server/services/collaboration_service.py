"""
Collaboration Service - Real-time collaboration management for workflows
"""
from typing import Dict, List, Set, Optional
from datetime import datetime
from fastapi import WebSocket
import json
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class UserInfo:
    """사용자 정보"""
    user_id: str
    username: str
    color: str  # 사용자 식별 색상
    connected_at: str
    cursor_position: Optional[Dict[str, float]] = None  # x, y 좌표


@dataclass
class CollaborationEvent:
    """협업 이벤트"""
    event_type: str  # 'user_joined', 'user_left', 'cursor_move', 'node_lock', 'node_unlock'
    workflow_id: str
    user_id: str
    timestamp: str
    data: Optional[Dict] = None


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        # workflow_id -> list of (websocket, user_info)
        self.active_connections: Dict[str, List[tuple[WebSocket, UserInfo]]] = {}
        # workflow_id -> set of locked node IDs -> user_id
        self.locked_nodes: Dict[str, Dict[str, str]] = {}
        # 사용자 색상 풀
        self.color_pool = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
            "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"
        ]
        self.user_colors: Dict[str, str] = {}
        
    def _assign_color(self, user_id: str) -> str:
        """사용자에게 색상 할당"""
        if user_id not in self.user_colors:
            # 현재 사용 중이지 않은 색상 찾기
            used_colors = set(self.user_colors.values())
            available_colors = [c for c in self.color_pool if c not in used_colors]
            if available_colors:
                self.user_colors[user_id] = available_colors[0]
            else:
                # 모든 색상이 사용 중이면 순환
                self.user_colors[user_id] = self.color_pool[len(self.user_colors) % len(self.color_pool)]
        return self.user_colors[user_id]
    
    async def connect(self, websocket: WebSocket, workflow_id: str, user_id: str, username: str):
        """새 WebSocket 연결 추가"""
        await websocket.accept()
        
        # 사용자 정보 생성
        user_info = UserInfo(
            user_id=user_id,
            username=username,
            color=self._assign_color(user_id),
            connected_at=datetime.utcnow().isoformat()
        )
        
        if workflow_id not in self.active_connections:
            self.active_connections[workflow_id] = []
            self.locked_nodes[workflow_id] = {}
        
        self.active_connections[workflow_id].append((websocket, user_info))
        
        logger.info(f"User {username} ({user_id}) connected to workflow {workflow_id}")
        
        # 새 사용자 입장 알림
        await self.broadcast(
            workflow_id,
            CollaborationEvent(
                event_type="user_joined",
                workflow_id=workflow_id,
                user_id=user_id,
                timestamp=datetime.utcnow().isoformat(),
                data={
                    "user_info": asdict(user_info),
                    "active_users": [asdict(ui) for _, ui in self.active_connections[workflow_id]]
                }
            ),
            exclude_user=None  # 모든 사용자에게 전송
        )
        
        return user_info
    
    def disconnect(self, websocket: WebSocket, workflow_id: str):
        """WebSocket 연결 제거"""
        if workflow_id not in self.active_connections:
            return None
        
        user_info = None
        for ws, ui in self.active_connections[workflow_id]:
            if ws == websocket:
                user_info = ui
                self.active_connections[workflow_id].remove((ws, ui))
                break
        
        # 워크플로우에 더 이상 연결된 사용자가 없으면 정리
        if not self.active_connections[workflow_id]:
            del self.active_connections[workflow_id]
            if workflow_id in self.locked_nodes:
                del self.locked_nodes[workflow_id]
        else:
            # 해당 사용자가 잠근 노드들 해제
            if workflow_id in self.locked_nodes:
                locked_by_user = [
                    node_id for node_id, uid in self.locked_nodes[workflow_id].items() 
                    if user_info and uid == user_info.user_id
                ]
                for node_id in locked_by_user:
                    del self.locked_nodes[workflow_id][node_id]
        
        if user_info:
            logger.info(f"User {user_info.username} ({user_info.user_id}) disconnected from workflow {workflow_id}")
        
        return user_info
    
    async def broadcast(
        self, 
        workflow_id: str, 
        event: CollaborationEvent, 
        exclude_user: Optional[str] = None
    ):
        """워크플로우의 모든 연결된 사용자에게 이벤트 브로드캐스트"""
        if workflow_id not in self.active_connections:
            return
        
        message = json.dumps(asdict(event))
        disconnected = []
        
        for websocket, user_info in self.active_connections[workflow_id]:
            # 제외할 사용자는 스킵
            if exclude_user and user_info.user_id == exclude_user:
                continue
            
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_info.username}: {e}")
                disconnected.append((websocket, user_info))
        
        # 연결이 끊어진 사용자 정리
        for ws, ui in disconnected:
            self.disconnect(ws, workflow_id)
            await self.broadcast(
                workflow_id,
                CollaborationEvent(
                    event_type="user_left",
                    workflow_id=workflow_id,
                    user_id=ui.user_id,
                    timestamp=datetime.utcnow().isoformat(),
                    data={"username": ui.username}
                )
            )
    
    async def lock_node(self, workflow_id: str, node_id: str, user_id: str) -> bool:
        """노드 잠금 시도"""
        if workflow_id not in self.locked_nodes:
            self.locked_nodes[workflow_id] = {}
        
        # 이미 다른 사용자가 잠근 경우
        if node_id in self.locked_nodes[workflow_id]:
            current_locker = self.locked_nodes[workflow_id][node_id]
            if current_locker != user_id:
                return False
        
        self.locked_nodes[workflow_id][node_id] = user_id
        
        # 잠금 알림 브로드캐스트
        await self.broadcast(
            workflow_id,
            CollaborationEvent(
                event_type="node_locked",
                workflow_id=workflow_id,
                user_id=user_id,
                timestamp=datetime.utcnow().isoformat(),
                data={"node_id": node_id}
            )
        )
        
        return True
    
    async def unlock_node(self, workflow_id: str, node_id: str, user_id: str) -> bool:
        """노드 잠금 해제"""
        if workflow_id not in self.locked_nodes:
            return False
        
        if node_id not in self.locked_nodes[workflow_id]:
            return False
        
        # 잠금한 사용자만 해제 가능
        if self.locked_nodes[workflow_id][node_id] != user_id:
            return False
        
        del self.locked_nodes[workflow_id][node_id]
        
        # 잠금 해제 알림 브로드캐스트
        await self.broadcast(
            workflow_id,
            CollaborationEvent(
                event_type="node_unlocked",
                workflow_id=workflow_id,
                user_id=user_id,
                timestamp=datetime.utcnow().isoformat(),
                data={"node_id": node_id}
            )
        )
        
        return True
    
    def get_active_users(self, workflow_id: str) -> List[UserInfo]:
        """워크플로우의 활성 사용자 목록"""
        if workflow_id not in self.active_connections:
            return []
        return [user_info for _, user_info in self.active_connections[workflow_id]]
    
    def get_locked_nodes(self, workflow_id: str) -> Dict[str, str]:
        """워크플로우의 잠긴 노드 목록"""
        return self.locked_nodes.get(workflow_id, {}).copy()


# 전역 연결 관리자 인스턴스
connection_manager = ConnectionManager()


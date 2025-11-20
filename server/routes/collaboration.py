"""
Collaboration Routes - WebSocket endpoints for real-time collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from server.services.collaboration_service import connection_manager, CollaborationEvent
from server.utils.logger import setup_logger
from datetime import datetime
import json

logger = setup_logger()
router = APIRouter(prefix="/ws")


@router.websocket("/collaboration/{workflow_id}")
async def collaboration_websocket(
    websocket: WebSocket,
    workflow_id: str,
    user_id: str = Query(..., description="사용자 ID"),
    username: str = Query(..., description="사용자 이름")
):
    """
    워크플로우 실시간 협업 WebSocket 엔드포인트
    
    클라이언트는 다음과 같이 연결합니다:
    ws://localhost:8000/ws/collaboration/{workflow_id}?user_id={user_id}&username={username}
    """
    user_info = None
    
    try:
        # 연결 수락 및 사용자 등록
        user_info = await connection_manager.connect(websocket, workflow_id, user_id, username)
        logger.info(f"WebSocket connected: {username} joined workflow {workflow_id}")
        
        # 현재 잠긴 노드 목록 전송
        locked_nodes = connection_manager.get_locked_nodes(workflow_id)
        await websocket.send_text(json.dumps({
            "event_type": "initial_state",
            "workflow_id": workflow_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "locked_nodes": locked_nodes,
                "active_users": [
                    {
                        "user_id": ui.user_id,
                        "username": ui.username,
                        "color": ui.color,
                        "connected_at": ui.connected_at
                    }
                    for ui in connection_manager.get_active_users(workflow_id)
                ]
            }
        }))
        
        # 클라이언트로부터 메시지 수신 대기
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            event_type = message.get("event_type")
            
            if event_type == "cursor_move":
                # 커서 이동 이벤트
                cursor_position = message.get("data", {}).get("cursor_position")
                if user_info and cursor_position:
                    user_info.cursor_position = cursor_position
                
                await connection_manager.broadcast(
                    workflow_id,
                    CollaborationEvent(
                        event_type="cursor_move",
                        workflow_id=workflow_id,
                        user_id=user_id,
                        timestamp=datetime.utcnow().isoformat(),
                        data={
                            "cursor_position": cursor_position,
                            "username": username
                        }
                    ),
                    exclude_user=user_id  # 자기 자신에게는 전송하지 않음
                )
            
            elif event_type == "node_lock":
                # 노드 잠금 요청
                node_id = message.get("data", {}).get("node_id")
                if node_id:
                    success = await connection_manager.lock_node(workflow_id, node_id, user_id)
                    await websocket.send_text(json.dumps({
                        "event_type": "node_lock_response",
                        "workflow_id": workflow_id,
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {
                            "node_id": node_id,
                            "success": success
                        }
                    }))
            
            elif event_type == "node_unlock":
                # 노드 잠금 해제
                node_id = message.get("data", {}).get("node_id")
                if node_id:
                    success = await connection_manager.unlock_node(workflow_id, node_id, user_id)
                    await websocket.send_text(json.dumps({
                        "event_type": "node_unlock_response",
                        "workflow_id": workflow_id,
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {
                            "node_id": node_id,
                            "success": success
                        }
                    }))
            
            elif event_type == "node_change":
                # 노드 변경 브로드캐스트
                await connection_manager.broadcast(
                    workflow_id,
                    CollaborationEvent(
                        event_type="node_change",
                        workflow_id=workflow_id,
                        user_id=user_id,
                        timestamp=datetime.utcnow().isoformat(),
                        data=message.get("data")
                    ),
                    exclude_user=user_id
                )
            
            elif event_type == "node_added":
                # 노드 추가 브로드캐스트
                await connection_manager.broadcast(
                    workflow_id,
                    CollaborationEvent(
                        event_type="node_added",
                        workflow_id=workflow_id,
                        user_id=user_id,
                        timestamp=datetime.utcnow().isoformat(),
                        data=message.get("data")
                    ),
                    exclude_user=user_id
                )
            
            elif event_type == "node_removed":
                # 노드 삭제 브로드캐스트
                await connection_manager.broadcast(
                    workflow_id,
                    CollaborationEvent(
                        event_type="node_removed",
                        workflow_id=workflow_id,
                        user_id=user_id,
                        timestamp=datetime.utcnow().isoformat(),
                        data=message.get("data")
                    ),
                    exclude_user=user_id
                )
            
            elif event_type == "edge_change":
                # 엣지 변경 브로드캐스트
                await connection_manager.broadcast(
                    workflow_id,
                    CollaborationEvent(
                        event_type="edge_change",
                        workflow_id=workflow_id,
                        user_id=user_id,
                        timestamp=datetime.utcnow().isoformat(),
                        data=message.get("data")
                    ),
                    exclude_user=user_id
                )
            
            else:
                logger.warning(f"Unknown event type: {event_type}")
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {username} left workflow {workflow_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {username}: {e}", exc_info=True)
    finally:
        # 연결 해제 처리
        user_info = connection_manager.disconnect(websocket, workflow_id)
        if user_info:
            # 사용자 퇴장 알림
            await connection_manager.broadcast(
                workflow_id,
                CollaborationEvent(
                    event_type="user_left",
                    workflow_id=workflow_id,
                    user_id=user_info.user_id,
                    timestamp=datetime.utcnow().isoformat(),
                    data={
                        "username": user_info.username,
                        "active_users": [
                            {
                                "user_id": ui.user_id,
                                "username": ui.username,
                                "color": ui.color
                            }
                            for ui in connection_manager.get_active_users(workflow_id)
                        ]
                    }
                )
            )


@router.get("/collaboration/{workflow_id}/active-users")
async def get_active_users(workflow_id: str):
    """워크플로우의 현재 활성 사용자 목록 조회"""
    users = connection_manager.get_active_users(workflow_id)
    return {
        "workflow_id": workflow_id,
        "active_users": [
            {
                "user_id": user.user_id,
                "username": user.username,
                "color": user.color,
                "connected_at": user.connected_at,
                "cursor_position": user.cursor_position
            }
            for user in users
        ],
        "count": len(users)
    }


@router.get("/collaboration/{workflow_id}/locked-nodes")
async def get_locked_nodes(workflow_id: str):
    """워크플로우의 현재 잠긴 노드 목록 조회"""
    locked = connection_manager.get_locked_nodes(workflow_id)
    return {
        "workflow_id": workflow_id,
        "locked_nodes": locked
    }


/**
 * Collaboration Service - 실시간 협업 WebSocket 클라이언트
 */

export interface UserInfo {
  user_id: string;
  username: string;
  color: string;
  connected_at: string;
  cursor_position?: { x: number; y: number };
}

export interface CollaborationEvent {
  event_type: string;
  workflow_id: string;
  user_id: string;
  timestamp: string;
  data?: any;
}

type EventCallback = (event: CollaborationEvent) => void;

export class CollaborationService {
  private ws: WebSocket | null = null;
  private workflowId: string | null = null;
  private userId: string;
  private username: string;
  private eventHandlers: Map<string, EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionalDisconnect = false;

  constructor(userId: string, username: string) {
    this.userId = userId;
    this.username = username;
  }

  /**
   * 워크플로우 협업 세션에 연결
   */
  connect(workflowId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Already connected to collaboration session');
        resolve();
        return;
      }

      this.workflowId = workflowId;
      this.isIntentionalDisconnect = false;

      const wsUrl = `ws://localhost:8000/ws/collaboration/${workflowId}?user_id=${this.userId}&username=${encodeURIComponent(this.username)}`;
      
      console.log(`[Collaboration] Connecting to: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[Collaboration] Connected to workflow ${workflowId}`);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: CollaborationEvent = JSON.parse(event.data);
          console.log(`[Collaboration] Received event:`, message);
          this.handleEvent(message);
        } catch (error) {
          console.error('[Collaboration] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[Collaboration] WebSocket closed');
        this.ws = null;

        // 의도적인 연결 해제가 아니면 재연결 시도
        if (!this.isIntentionalDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[Collaboration] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (this.workflowId) {
              this.connect(this.workflowId).catch(err => {
                console.error('[Collaboration] Reconnection failed:', err);
              });
            }
          }, delay);
        }
      };
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.workflowId = null;
    console.log('[Collaboration] Disconnected');
  }

  /**
   * 이벤트 핸들러 등록
   */
  on(eventType: string, callback: EventCallback) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(callback);
  }

  /**
   * 이벤트 핸들러 제거
   */
  off(eventType: string, callback: EventCallback) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 이벤트 처리
   */
  private handleEvent(event: CollaborationEvent) {
    const handlers = this.eventHandlers.get(event.event_type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }

    // 모든 이벤트를 수신하는 와일드카드 핸들러
    const allHandlers = this.eventHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(event));
    }
  }

  /**
   * 이벤트 전송
   */
  private send(event: Partial<CollaborationEvent>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Collaboration] Cannot send event: WebSocket not connected');
      return;
    }

    const fullEvent = {
      workflow_id: this.workflowId!,
      user_id: this.userId,
      timestamp: new Date().toISOString(),
      ...event
    };

    this.ws.send(JSON.stringify(fullEvent));
  }

  /**
   * 커서 위치 전송
   */
  sendCursorMove(x: number, y: number) {
    this.send({
      event_type: 'cursor_move',
      data: {
        cursor_position: { x, y }
      }
    });
  }

  /**
   * 노드 잠금 요청
   */
  async lockNode(nodeId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve(false);
        return;
      }

      // 응답 대기를 위한 일회성 핸들러
      const responseHandler = (event: CollaborationEvent) => {
        if (event.event_type === 'node_lock_response' && event.data?.node_id === nodeId) {
          this.off('node_lock_response', responseHandler);
          resolve(event.data.success);
        }
      };

      this.on('node_lock_response', responseHandler);

      this.send({
        event_type: 'node_lock',
        data: { node_id: nodeId }
      });

      // 5초 타임아웃
      setTimeout(() => {
        this.off('node_lock_response', responseHandler);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * 노드 잠금 해제
   */
  async unlockNode(nodeId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve(false);
        return;
      }

      const responseHandler = (event: CollaborationEvent) => {
        if (event.event_type === 'node_unlock_response' && event.data?.node_id === nodeId) {
          this.off('node_unlock_response', responseHandler);
          resolve(event.data.success);
        }
      };

      this.on('node_unlock_response', responseHandler);

      this.send({
        event_type: 'node_unlock',
        data: { node_id: nodeId }
      });

      setTimeout(() => {
        this.off('node_unlock_response', responseHandler);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * 노드 변경 브로드캐스트
   */
  broadcastNodeChange(nodeId: string, changes: any) {
    this.send({
      event_type: 'node_change',
      data: {
        node_id: nodeId,
        changes
      }
    });
  }

  /**
   * 노드 추가 브로드캐스트
   */
  broadcastNodeAdd(node: any) {
    this.send({
      event_type: 'node_added',
      data: {
        node
      }
    });
  }

  /**
   * 노드 삭제 브로드캐스트
   */
  broadcastNodeRemove(nodeId: string) {
    this.send({
      event_type: 'node_removed',
      data: {
        node_id: nodeId
      }
    });
  }

  /**
   * 엣지 변경 브로드캐스트
   */
  broadcastEdgeChange(edgeId: string, changes: any) {
    this.send({
      event_type: 'edge_change',
      data: {
        edge_id: edgeId,
        changes
      }
    });
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스 (사용자 정보는 나중에 설정)
let collaborationServiceInstance: CollaborationService | null = null;

export function getCollaborationService(userId?: string, username?: string): CollaborationService {
  if (!collaborationServiceInstance && userId && username) {
    collaborationServiceInstance = new CollaborationService(userId, username);
  }
  
  if (!collaborationServiceInstance) {
    throw new Error('CollaborationService not initialized. Please provide userId and username.');
  }
  
  return collaborationServiceInstance;
}

export function resetCollaborationService() {
  if (collaborationServiceInstance) {
    collaborationServiceInstance.disconnect();
    collaborationServiceInstance = null;
  }
}


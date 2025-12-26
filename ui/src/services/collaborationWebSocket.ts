/**
 * CollaborationWebSocket
 * 
 * Manages WebSocket connections for real-time collaboration features.
 * Handles connection lifecycle, automatic reconnection with exponential backoff,
 * message sending/receiving, and connection state management.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import {
  ClientMessage,
  ServerMessage,
  ConnectionStatus,
  CollaborationError,
  ErrorCodes,
} from '../types/collaboration';

/**
 * Configuration options for the WebSocket client
 */
export interface WebSocketConfig {
  /** Base URL for the WebSocket server */
  url: string;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in milliseconds */
  initialReconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

/**
 * Event handlers for WebSocket events
 */
export interface WebSocketEventHandlers {
  /** Called when a message is received from the server */
  onMessage?: (message: ServerMessage) => void;
  /** Called when the connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Called when an error occurs */
  onError?: (error: CollaborationError) => void;
  /** Called when the connection is established */
  onConnect?: () => void;
  /** Called when the connection is closed */
  onDisconnect?: () => void;
}

/**
 * WebSocket client for real-time collaboration
 */
export class CollaborationWebSocket {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private handlers: WebSocketEventHandlers;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private currentStatus: ConnectionStatus = 'disconnected';
  private isIntentionallyClosed = false;
  private messageQueue: ClientMessage[] = [];

  constructor(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = {
      url: config.url,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      initialReconnectDelay: config.initialReconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
    this.handlers = handlers;
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.updateStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            const error = new CollaborationError(
              'Connection timeout',
              ErrorCodes.CONNECTION_TIMEOUT
            );
            this.handleError(error);
            reject(error);
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          this.clearConnectionTimeout();
          this.reconnectAttempts = 0;
          this.updateStatus('connected');
          this.startHeartbeat();
          this.flushMessageQueue();
          this.handlers.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (event) => {
          this.clearConnectionTimeout();
          const error = new CollaborationError(
            'WebSocket error occurred',
            ErrorCodes.CONNECTION_FAILED
          );
          this.handleError(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.clearConnectionTimeout();
          this.stopHeartbeat();
          this.updateStatus('disconnected');
          this.handlers.onDisconnect?.();

          // Attempt reconnection if not intentionally closed
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.clearConnectionTimeout();
        const collaborationError = new CollaborationError(
          'Failed to create WebSocket connection',
          ErrorCodes.CONNECTION_FAILED
        );
        this.handleError(collaborationError);
        reject(collaborationError);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimeout();
    this.stopHeartbeat();
    this.clearConnectionTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus('disconnected');
  }

  /**
   * Send a message to the server
   */
  public send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        const collaborationError = new CollaborationError(
          'Failed to send message',
          ErrorCodes.INVALID_MESSAGE
        );
        this.handleError(collaborationError);
      }
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(message);
    }
  }

  /**
   * Get the current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.currentStatus === 'connected';
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const error = new CollaborationError(
        'Max reconnection attempts reached',
        ErrorCodes.RECONNECTION_FAILED,
        false
      );
      this.handleError(error);
      return;
    }

    this.updateStatus('reconnecting');

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        // Error already handled in connect()
      });
    }, delay);
  }

  /**
   * Handle incoming messages from the server
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      this.handlers.onMessage?.(message);
    } catch (error) {
      const collaborationError = new CollaborationError(
        'Failed to parse server message',
        ErrorCodes.INVALID_MESSAGE
      );
      this.handleError(collaborationError);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: CollaborationError): void {
    this.handlers.onError?.(error);
  }

  /**
   * Update the connection status
   */
  private updateStatus(status: ConnectionStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.handlers.onStatusChange?.(status);
    }
  }

  /**
   * Start sending heartbeat pings
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop sending heartbeat pings
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clear the reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Clear the connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Flush queued messages after reconnection
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}

/**
 * Factory function to create a CollaborationWebSocket instance
 */
export function createCollaborationWebSocket(
  config: WebSocketConfig,
  handlers?: WebSocketEventHandlers
): CollaborationWebSocket {
  return new CollaborationWebSocket(config, handlers);
}

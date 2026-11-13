import { DEFAULT_API_BASE_URL } from './ports';

/**
 * 백엔드 API 기본 URL. 다른 주소를 쓰려면 VITE_API_BASE_URL을 설정합니다.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

/**
 * 백엔드 WebSocket 기본 URL (http -> ws, https -> wss)
 */
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

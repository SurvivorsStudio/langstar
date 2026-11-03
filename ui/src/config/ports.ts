/**
 * LangStar 기본 포트
 *
 * vite.config.ts(Node)와 앱 코드(브라우저)가 함께 쓰므로 import.meta.env 등
 * 실행 환경에 의존하는 코드를 넣지 않습니다.
 */
export const BACKEND_PORT = 7827;
export const FRONTEND_PORT = 7828;

export const DEFAULT_API_BASE_URL = `http://localhost:${BACKEND_PORT}`;

import logging
import sys
import traceback
from datetime import datetime

class ColoredFormatter(logging.Formatter):
    """에러 시 색상을 변경하는 커스텀 포매터"""
    
    COLORS = {
        'ERROR': '\033[91m',    # 빨간색
        'WARNING': '\033[93m',  # 노란색
        'INFO': '\033[92m',     # 초록색
        'DEBUG': '\033[94m',    # 파란색
        'CRITICAL': '\033[95m', # 보라색
        'RESET': '\033[0m'      # 리셋
    }
    
    def format(self, record):
        # 에러 레벨에 따라 색상 적용
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        record.levelname = f"{color}{record.levelname}{self.COLORS['RESET']}"
        
        # 에러인 경우 스택 트레이스 추가
        if record.levelno >= logging.ERROR and hasattr(record, 'exc_info') and record.exc_info:
            # 기존 포맷에 스택 트레이스 추가
            formatted = super().format(record)
            if not formatted.endswith('\n'):
                formatted += '\n'
            formatted += f"{color}Stack Trace:{self.COLORS['RESET']}\n"
            formatted += ''.join(traceback.format_exception(*record.exc_info))
            return formatted
        
        return super().format(record)

def setup_logger():
    """로거 설정"""
    # 기존 핸들러 제거
    logger = logging.getLogger("uvicorn")
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 새로운 핸들러 추가
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ColoredFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    # FastAPI 로거도 설정
    fastapi_logger = logging.getLogger("fastapi")
    fastapi_logger.setLevel(logging.INFO)
    fastapi_handler = logging.StreamHandler(sys.stdout)
    fastapi_handler.setFormatter(ColoredFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    fastapi_logger.addHandler(fastapi_handler)
    
    # 루트 로거도 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_handler = logging.StreamHandler(sys.stdout)
    root_handler.setFormatter(ColoredFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    root_logger.addHandler(root_handler)
    
    # 예외 처리기 설정
    def handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            # Ctrl+C는 기본 처리
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        logger = logging.getLogger("uncaught_exception")
        logger.critical(
            "Uncaught exception",
            exc_info=(exc_type, exc_value, exc_traceback)
        )
    
    # 전역 예외 처리기 설정
    sys.excepthook = handle_exception
    
    return logger 
from fastapi import APIRouter, HTTPException
import logging

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get('/health')
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Server is running"}

@router.get('/test-error')
def test_error():
    """Test endpoint to generate an error for logging testing"""
    try:
        logger.info("Testing error logging - this should trigger an exception")
        # 의도적으로 에러 발생
        result = 1 / 0
        return {"result": result}
    except Exception as e:
        logger.error(f"Test error occurred: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")

@router.get('/test-uncaught-error')
def test_uncaught_error():
    """Test endpoint to generate an uncaught error"""
    logger.info("Testing uncaught error - this should trigger global exception handler")
    # try-except 없이 에러 발생
    result = 1 / 0
    return {"result": result} 

# Deployment ID: e55f9361-e05e-4826-8662-ae312b9a7a7b
# Generated at: 2025-08-06T00:31:27.651471


from pydantic import BaseModel
from typing import Annotated
import operator
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from langgraph.graph import StateGraph, START, END
from langchain.agents import create_tool_calling_agent, AgentExecutor
from typing import Optional
from langchain_core.tools import StructuredTool
from langgraph.checkpoint.memory import InMemorySaver
import logging
from functools import wraps
from typing import Any, Dict
import time
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

def log_node_execution(node_id: str, node_name: str, node_type: str):
    """
    LangGraph node function execution logging decorator.
    Records node start/end, input/output (partial), and detailed error information.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 노드 실행 시작 로깅
            start_time = time.time()
            node_name_display = func.__name__
            
            # LangGraph 노드는 보통 첫 번째 인자로 'state'를 받습니다.
            state: Dict[str, Any] = kwargs.get('state', args[0] if args else {})
            
            # 입력 상태 로깅 (민감 정보 보호 및 성능을 위해 일부만 로깅)
            input_log_str = str(state.get('messages', state))[:100] + "..." if state else "None"
            
            if logger.isEnabledFor(logging.INFO):
                logger.info("[" + node_name_display + "] Node started. Input state (partial): " + input_log_str)
            
            try:
                # 원본 노드 함수 실행
                result = func(*args, **kwargs)
                
                # 실행 완료 시간 계산
                end_time = time.time()
                duration_ms = int((end_time - start_time) * 1000)
                
                # 출력 결과 로깅 (민감 정보 보호 및 성능을 위해 일부만 로깅)
                output_log_str = str(result)[:100] + "..." if result else "None"
                if logger.isEnabledFor(logging.INFO):
                    logger.info("[" + node_name_display + "] Node finished. Output result (partial): " + output_log_str)
                    logger.info("[" + node_name_display + "] Execution time: " + str(duration_ms) + "ms")
                
                return result
            except Exception as e:
                # 에러 발생 시, 노드 이름과 함께 상세 에러 정보(스택 트레이스 포함) 로깅
                end_time = time.time()
                duration_ms = int((end_time - start_time) * 1000)
                logger.exception("[" + node_name_display + "] Error in node. Original error: " + str(e))
                logger.error("[" + node_name_display + "] Execution time before error: " + str(duration_ms) + "ms")
                raise # 에러를 다시 발생시켜 LangGraph의 에러 핸들링으로 전달
        return wrapper
    return decorator

class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'question': 'mdf 판매량 동향 예측해줘', 'system_prompt': '', 'result': ''}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Prompt', 'node_type': 'promptNode'}], 'node_name': 'Start'}
    Start :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['agent_response']}}
    End :dict = {}
    Prompt_Config :dict = {'config': {'template': '너는 질문을 작업 유형별로 정확하게 분류하는 전문가야.\n다음 질문에 대해 필요한 작업 유형을 최대 4개까지 선택해줘. 아래에서 해당하는 것만 골라줘.\n\n- interpretation: 예측 모델에 대한 해석을 제공합니다. (MDF, PB, 시판, 준공실적)\n- news: 사용자 질문과 관련된 뉴스를 검색합니다.\n- indicators: 경기/경제 지표의 값을 파악합니다. \n- concept: 경기/경제/정책 관련 용어를 설명합니다.\n\n단, 사용자가 정보를 요청할 때는 indicators와 concept를 함께 주면 좋습니다.\n\n답변 포맷 : 쉼표 구분 \n예시 : news,indicators\n\n주의사항\n- 서문을 작성하지 않습니다.\n\nuser : {question}\n'}, 'outputVariable': 'system_prompt', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent', 'node_type': 'agentNode'}], 'node_name': 'Prompt'}
    Prompt :dict = {}
    Agent_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'question', 'systemPromptInputKey': 'system_prompt', 'tools': [], 'agentOutputVariable': 'agent_response', 'temperature': 0.1, 'topK': 1, 'maxTokens': 50, 'node_type': 'agentNode', 'next_node': [{'node_name': 'ready_function', 'node_type': 'functionNode'}], 'node_name': 'Agent', 'chat_history': []}}
    Agent :dict = {}
    Agent_concept_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'question', 'systemPromptInputKey': 'concept_system', 'tools': [{'id': 'group-1753859586902', 'name': 'read_concept_info_frqom_s3', 'description': '\n이 도구는 필수 인자 fileName 통해 경제 지표 설명을 s3에서 가져옵니다.\nfileName은 사전에 정의된 리스트에서 선택되어야 하며, 해당 지표명과 일치하는 .txt 파일을 AWS S3 경로에서 읽어와 내용을 반환합니다.\n\nfileName 사용할 수 있는 값은 다음과 같습니다:\n가구판매액,  거래활발지수 ,  건설경기실사지수매출전망 ,  건설경기실사지수업황전망 ,  공동주택통합매매실거래가격지수 ,  금리 ,  내구재_지출전망CSI ,  다세대주택매매거래현황 ,  다세대준공실적 ,  다세대착공실적 ,  동행종합지수 ,  목재수입금액지수 ,  목재수입물가지수 ,  목재수입물량지수 ,  민간아파트신규분양세대수 ,  변동형주택담보대출 ,  부동산시장소비심리지수 ,  상하이컨테이너운임지수_SCFI_ ,  선행종합지수 ,  세대수증감률_수도권 ,  소비자동향조사 ,  소비자심리지수 ,  아파트매매실거래가격지수 ,  아파트미분양호수 ,  아파트전세가격지수 ,  아파트주택매매거래현황 ,  아파트준공실적 ,  아파트착공실적 ,  연립다세대매매실거래가격지수 ,  연립다세대전세가격지수 ,  연립준공실적 ,  연립착공실적 ,  원목수입금액지수 ,  원목수입물가지수 ,  원목수입물량지수 ,  인구증감률_수도권 ,  종합전세가격지수 ,  주거비_지출전망CSI ,  주택담보대출금리 ,  주택담보대출금액 ,  주택매매시장소비심리지수 ,  주택시장소비심리지수 ,  주택전세시장소비심리지수 ,  총전입건수 ,  출생아수 ,  포틀랜드시멘트생산자물가지수 ,  혼인건수 ,  후행종합지수 \n\ntool 사용 예시:\n사용자 요청: \'거래활발지수 지표 설명 보여줘\'\n도구 호출: read_indicator_info_from_s3(\'거래활발지수\')\n\n사용자 요청: \'건설 경기 실사지수 전망 대해 알려줘\'\n도구 호출: read_indicator_info_from_s3(\'건설경기실사지수매출전망\')\n\n사용자 요청: \'내구재 지출전망CSI 관련 지표 설명 줘\'\n도구 호출: read_indicator_info_from_s3(\'내구재_지출전망CSI\')\n\n주의:\nfileName 없으면 지표 검색을 수행할 수 없습니다. 사용자가 질문에서 필요한 fileName 먼저 파악해야 합니다.\nfileName 값이 잘못되었거나 S3에 해당 파일이 존재하지 않으면, "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."라는 메시지를 반환합니다.', 'code': '\nimport boto3\n\ndef read_concepts_info_from_s3(fileName):\n    def read_txt_file(bucket_name, fileName):\n        response = s3_client.get_object(Bucket=bucket_name, Key=fileName)\n        content = response[\'Body\'].read().decode(\'utf-8\')\n        return content\n    s3_client = boto3.client(\'s3\')\n    bucket_name = \'sb-snop-bucket\'\n    file_key    = f\'demand_fcst/data/Chatbot/external_all/{fileName}.txt\'\n    print(file_key)\n    try:\n        indicator = read_txt_file(bucket_name, file_key)\n        return indicator\n    except Exception as e:\n        print(e)\n        return "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."'}], 'agentOutputVariable': 'agent_response', 'stream': True, 'node_type': 'agentNode', 'next_node': [{'node_name': 'pop_function', 'node_type': 'functionNode'}], 'node_name': 'Agent_concept', 'chat_history': []}}
    Agent_concept :dict = {}
    Agent_2_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'question', 'systemPromptInputKey': 'indicator_system', 'tools': [{'id': 'group-1753859625463', 'name': 'read_indicator_value_from_s3', 'description': '이 도구는 fileName 이라는 필수 인자를 통해 어떤 경제 지표의 값을 가져올지 알아야 합니다.\nfileName 사전에 정의된 리스트에서 선택되어야 하며, 해당 지표명과 일치하는 .txt 파일을 AWS S3 경로에서 읽어와 내용을 반환합니다.\n\nfileName 사용할 수 있는 값은 다음과 같습니다:\nSCFI, 가구점개인사업자수, 가구판매액, 거래활발지수, 건설경기실사지수매출전망, 건설경기실사지수업황전망, 건설기성액, 건설수주액, 경제심리지수, 공동주택통합매매실거래가격지수, 광공업생산지수, 금리, 기계류내수출하지수, 내구재 지출전망CSI, 내수출하지수, 다세대주택매매거래현황, 다세대준공실적, 다세대착공실적, 동행종합지수, 목재수입금액지수, 목재수입물가지수, 목재수입물량지수, 미분양호수, 민간아파트신규분양세대수, 변동형주택담보대출, 부동산시장소비심리지수, 비농립어업취업자수, 서비스업생산지수, 선행종합지수, 세대수증감률_수도권, 소매판매액지수, 소비자심리지수, 수입물량_강화마루, 수입물량_합판강마루, 수입액, 수출입물가비율, 신규분양세대수, 아파트매매실거래가격지수, 아파트미분양호수, 아파트전세가격지수, 아파트주택매매거래현황, 아파트준공실적, 아파트착공실적, 연립다세대매매실거래가격지수, 연립다세대전세가격지수, 연립주택매매거래현황, 연립준공실적, 연립착공실적, 원목수입금액지수, 원목수입물가지수, 원목수입물량지수, 인구증감률_수도권, 장단기금리차, 재고순환지표, 종합건설사폐업건수, 종합전세가격지수, 주거비 지출전망CSI, 주택담보대출금리, 주택담보대출금액, 주택매매시장소비심리지수, 주택시장소비심리지수, 주택전세시장소비심리지수, 총전입건수, 출생아수, 코스피, 포틀랜드시멘트, 혼인건수, 환율, 후행종합지수\n\n도구 사용 예시:\n\n사용자 요청: \'SCFI 수치 알려줘\'\n도구 호출: read_indicator_value_from_s3(\'SCFI\')\n\n사용자 요청: \'건설수주액 값이 궁금해\'\n도구 호출: read_indicator_value_from_s3(\'건설수주액\')\n\n사용자 요청: \'내구재 지출전망CSI 최신 값 줘\'\n도구 호출: read_indicator_value_from_s3(\'내구재 지출전망CSI\')\n\n주의:\nfileName 없으면 지표 값을 검색할 수 없습니다. 사용자의 질문에서 필요한 fileName 먼저 파악해야 합니다.\nfileName 값이 잘못되었거나 S3에 해당 파일이 존재하지 않으면, "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."라는 메시지를 반환합니다.\n', 'code': '\nimport boto3\n\ndef read_indicator_value_from_s3(fileName):\n    def read_txt_file(bucket_name, file_name):\n        response = s3_client.get_object(Bucket=bucket_name, Key=file_name)\n        content = response[\'Body\'].read().decode(\'utf-8\')\n        return content\n    s3_client = boto3.client(\'s3\')\n    bucket_name = \'sb-snop-bucket\'\n    file_key    = f\'demand_fcst/view/chat/external/{fileName}.txt\'\n    print(file_key)\n    try:\n        indicator = read_txt_file(bucket_name, file_key)\n        return indicator\n    except Exception as e:\n        print(e)\n        return "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."'}], 'agentOutputVariable': 'agent_response', 'node_type': 'agentNode', 'next_node': [{'node_name': 'pop_function', 'node_type': 'functionNode'}], 'node_name': 'Agent_2', 'chat_history': []}}
    Agent_2 :dict = {}
    Agent_3_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'question', 'systemPromptInputKey': 'new_system', 'tools': [{'id': 'group-1753859644753', 'name': 'search_news_articles', 'description': '뉴스 기사 검색 도구입니다.\n이 도구는 찾고자 하는 키워드를 list에 넣어, 입뉴스를 검색합니다.\nqueries는 하나 이상의 검색어(키워드)로 구성된 list이며, 각 검색어에 대해 뉴스 기사를 최대 3개까지 수집합니다.\n\n도구 사용 예시:\n사용자 요청: "최근 아파트 분양 관련 뉴스 보여줘"\n도구 호출: search_news_articles(queries=["아파트 분양", "2025년 3월 아파트 분양 건수"])\n사용자 요청: "목재 수입 동향에 대한 뉴스 기사 찾아줘"\n도구 호출: search_news_articles(queries=["목재 수입 동향"])\n사용자 요청: "주택 시장 전망과 금리에 대한 뉴스 검색해줘"\n도구 호출: search_news_articles(queries=["주택 시장 전망", "금리"])\n\n내부 처리 방식 요약:\n입력된 검색어 각각에 대해 뉴스 검색을 수행합니다.\n각 뉴스 결과에 대해 URL 본문을 직접 크롤링하여 주요 내용을 추출합니다.\n본문이 없거나 URL에 접근이 실패한 경우, 제공된 요약 또는 "[본문 없음]"으로 대체됩니다.\n\n주의:\n키워드는 반드시 리스트에 담아서 전달해야 합니다. 예를 들어 ["부동산 시장 동향" ]\nqueries가 빈 리스트이거나 문자열이 아닌 값이 포함되면 검색이 수행되지 않습니다.', 'code': '\nimport requests\nfrom bs4 import BeautifulSoup\nfrom duckduckgo_search import DDGS\nimport time\n\ndef search_news_articles(queries, max_results=3):\n\n    def fetch_page_content(url):\n        """주어진 뉴스 기사 URL에서 본문 내용을 크롤링"""\n        try:\n            headers = {"User-Agent": "Mozilla/5.0"}\n            response = requests.get(url, headers=headers, timeout=10)\n            response.raise_for_status()  # HTTP 오류 발생 시 예외 처리\n            soup = BeautifulSoup(response.text, "html.parser")\n    \n            # 본문 추출 (일반적인 뉴스/블로그 구조 적용)\n            paragraphs = soup.find_all("p")\n            content = "\\n".join([p.get_text() for p in paragraphs])\n            return content.strip()\n    \n        except requests.RequestException as e:\n            print(f"Error fetching {url}: {e}")\n            return \'\'\n            \n   \n    articles = []\n    print( type(queries)  )\n\n    if type(queries) == str : \n        query = queries\n        for not_use_keyword in [\'최근\', \'최신\']:\n            query = query.replace(not_use_keyword, \'\').strip()\n        \n        try:\n            time.sleep(1)  # Ratelimit 방지용 딜레이\n            results = DDGS().news(keywords=query, max_results=max_results)\n        except Exception as e:\n            print(f"[ERROR] DDG 검색 중 오류 발생: {e}")\n            \n        for res in results:\n            url = res.get("url")\n            if url:\n                article_content = fetch_page_content(url)  # 본문 크롤링\n                if not article_content:\n                    article_content = res.get(\'body\') or \'[본문 없음]\'\n                source = res.get(\'source\') or \'[출처 없음]\'\n                title = res.get("title") or \'[제목 없음]\'\n                date = res.get("date") or \'[날짜 없음]\'\n                articles.append(\n                    f"쿼리: {query}\\n언론사: {source}\\n제목: {title} ( {url} )\\n날짜: {date}\\n\\n본문:\\n{article_content}\\n"\n                )\n\n\n    if type(queries) == list : \n        for query in queries:\n            print(f"[INFO] 검색어: {query}")\n            for not_use_keyword in [\'최근\', \'최신\']:\n                query = query.replace(not_use_keyword, \'\').strip()\n    \n            try:\n                time.sleep(1)  # Ratelimit 방지용 딜레이\n                results = DDGS().news(keywords=query, max_results=max_results)\n            except Exception as e:\n                print(f"[ERROR] DDG 검색 중 오류 발생: {e}")\n                continue\n    \n            for res in results:\n                url = res.get("url")\n                if url:\n                    article_content = fetch_page_content(url)  # 본문 크롤링\n                    if not article_content:\n                        article_content = res.get(\'body\') or \'[본문 없음]\'\n                    source = res.get(\'source\') or \'[출처 없음]\'\n                    title = res.get("title") or \'[제목 없음]\'\n                    date = res.get("date") or \'[날짜 없음]\'\n                    articles.append(\n                        f"쿼리: {query}\\n언론사: {source}\\n제목: {title} ( {url} )\\n날짜: {date}\\n\\n본문:\\n{article_content}\\n"\n                    )\n\n    return articles\n'}], 'agentOutputVariable': 'agent_response', 'node_type': 'agentNode', 'next_node': [{'node_name': 'pop_function', 'node_type': 'functionNode'}], 'node_name': 'Agent_3', 'chat_history': []}}
    Agent_3 :dict = {}
    Agent_4_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'question', 'systemPromptInputKey': 'interpretation_system', 'tools': [{'id': 'group-1753859661014', 'name': 'model_analysis', 'description': '이 도구는 보드 수요 예측 분석 결과를 제공합니다. 사용하려면 세 가지 인자를 반드시 입력해야 합니다.\n\n첫 번째 인자: 보드 종류인 boardCategory 이며, 가능한 값은 \'MDF\', \'PB\', \'시판\', \'준공실적\'입니다.\n두 번째 인자: 분석 기준 연월인 yyyymm으로, \'202407\'처럼 6자리 숫자 형식이어야 합니다.\n세 번째 인자: 세부 품목 유형인 prodType이며, boardCategory 에 따라 선택 가능한 값이 다릅니다.\n\nboardCategory 별 prodType 값은 다음과 같습니다.\nMDF: D, DI, DL, R, R+D, 전체\nPB: E0(13), E0(15), E0(8), E1(13), E1(8), 전체\n\n시판: 강마루, 강화마루, 벽장재, 진, 전체\n준공실적: 아파트준공실적 (고정값)\n입력값이 제공되지 않을 경우 기본값은 다음과 같습니다.\n\nboardCategory 가 없으면 \'MDF\'\nprodType이 없으면 \'전체\'\nyyyymm이 없거나 명확하지 않으면 빈 문자열(\'\')로 전달합니다.\n\n사용 예시는 다음과 같습니다.\n"PB 2024년 07 분석 내용 보여줘" →model_analysis(\'PB\', \'202407\', \'전체\')\n\n"MDF DL 예상 판매량 알려줘" →model_analysis(\'MDF\', \'\', \'DL\')\n\n"수요예측 결과 알려줘" →model_analysis(\'MDF\', \'\', \'전체\')\n\n"2025년 3월 MDF DL 예상 판매량 알려줘" →model_analysis(\'준공실적\', \'202503\', \'\')\n\n"이번달 MDF DL 예상 판매량 알려줘" →model_analysis(\'준공실적\', \'\', \'\')\n\n주의사항:\nyyyymm은 반드시 6자리 숫자 형식이어야 하며, 그렇지 않으면 오류가 발생할 수 있습니다.\n파라미터를 반드시 3개를 던져야 합니다. ', 'code': 'import boto3\n\ndef model_analysis_tool(boardCategory : str = "MDF", yyyymm: str = "", prodType: str = "전체") -> str:\n    s3_client = boto3.client(\'s3\')\n    print( \'######## model_analysis #########\' ) \n    print( \'boardCategory  : \', type(boardCategory ) ) \n    print( \'boardCategory  : \', boardCategory  ) \n    print( \'yyyymm : \', yyyymm ) \n    print( \'prodType : \', prodType ) \n    \n\n    def read_txt_file(bucket_name, file_name):\n        s3_client = boto3.client(\'s3\')\n        response = s3_client.get_object(Bucket=bucket_name, Key=file_name)\n        content = response[\'Body\'].read().decode(\'utf-8\')\n        return content\n        \n    def read_summary_file_from_s3(boardCategory, yyyymm, prodType):\n        bucket_name = \'sb-snop-bucket\'\n        if boardCategory == \'MDF\':\n            prodType = f\'MDF_판매량_{prodType}\'\n        elif boardCategory == \'PB\':\n            prodType = f\'PB_판매량_{prodType}\'\n        elif boardCategory == \'시판\':\n            prodType = f\'시판_판매량_{prodType}\'\n        elif boardCategory == \'준공실적\':\n            prodType = \'아파트준공실적\'\n    \n        file_key = f\'demand_fcst/view/{boardCategory}/{yyyymm}/{prodType}/chat_txt.txt\'\n        print(file_key)\n        try:\n            summary = read_txt_file(bucket_name, file_key)\n            return summary\n        except Exception as e:\n            print(e)\n            return "관련 정보를 찾을 수 없습니다. 제품명, 기준년월 및 상세품목을 다시 한 번 확인해주세요."\n    \n        # 폴더 가지고 오기\n    def list_s3_folders(bucket_name, prefix):\n        """\n        List folders (prefixes) in an S3 bucket under a specific prefix\n        \n        Args:\n            bucket_name (str): Name of the S3 bucket\n            prefix (str): Path prefix to list folders from\n        """    \n        # Ensure prefix ends with \'/\'\n        if not prefix.endswith(\'/\'):\n            prefix += \'/\'\n        \n        # Use paginator to handle cases with many objects\n        paginator = s3_client.get_paginator(\'list_objects_v2\')\n        \n        # Set delimiter to \'/\' to get folder-like behavior\n        page_iterator = paginator.paginate(\n            Bucket=bucket_name,\n            Prefix=prefix,\n            Delimiter=\'/\'\n        )\n        \n        folders = []\n        \n        try:\n            for page in page_iterator:\n                # Get common prefixes (folders)\n                if \'CommonPrefixes\' in page:\n                    for prefix_obj in page[\'CommonPrefixes\']:\n                        # Remove the base prefix to get just the folder name\n                        folder_path = prefix_obj[\'Prefix\']\n                        folder_name = folder_path.rstrip(\'/\').split(\'/\')[-1]\n                        folders.append(folder_name)\n                        \n            return folders\n            \n        except Exception as e:\n            print(f"Error listing folders: {str(e)}")\n            return []\n    \n    def list_yyyymm_by_boardCategory(boardCategory):\n        max_to_show = 3\n    \n        bucket_name = "sb-snop-bucket"\n        folder_path = f\'demand_fcst/view/{boardCategory}\'\n        \n        folders = sorted(list_s3_folders(bucket_name, folder_path), reverse=True)[:max_to_show]\n        print( folders )\n        \n        if folders:\n            return folders\n\n    # boardCategory 알려주지 않으면 무조건 MDF로 답변한다. \n    if boardCategory == \'\'  : \n        boardCategory = \'MDF\'\n\n    # 타입을 주지 않으면 무조건 전체로 답변한다. \n    if prodType == \'\' : \n        if boardCategory == \'MDF\':\n            prodType = \'MDF_판매량_전체\'\n        elif boardCategory == \'PB\':\n            prodType = \'PB_판매량_전체\'\n        elif boardCategory == \'시판\':\n            prodType = \'시판_판매량_전체\'\n        elif boardCategory == \'준공실적\':\n            prodType = \'아파트준공실적\'\n        else : \n            prodType = \'MDF_판매량_전체\'\n    \n    # 기간을 알려주지 않으면, 최산 데이터로 답변한다. \n    if yyyymm == \'\' :\n        yyyymm = list_yyyymm_by_boardCategory( boardCategory )[0]\n\n    \n    return read_summary_file_from_s3(boardCategory, yyyymm, prodType)'}], 'agentOutputVariable': 'agent_response', 'node_type': 'agentNode', 'next_node': [{'node_name': 'pop_function', 'node_type': 'functionNode'}], 'node_name': 'Agent_4', 'chat_history': []}}
    Agent_4 :dict = {}
    ready_function_Config :dict = {'config': {'code': '# Write your Python code here\nimport datetime\n\ndef str_to_list( state ): \n    today = datetime.datetime.now()\n    agent_response = state[\'agent_response\'].replace(" ","").split(",")\n    state[\'job_list\'] = agent_response\n    # state[\'job_list\'] = [\'concept\']\n    state[\'job_cnt\'] = len(agent_response)\n    state[\'today\'] = str( today )\n\n    return state'}, 'node_type': 'functionNode', 'next_node': [{'node_name': 'search_or_result', 'node_type': 'conditionNode'}], 'node_name': 'ready_function'}
    ready_function :dict = {}
    search_or_result_Config :dict = {'config': [{'targetNodeLabel': 'job_condition', 'condition': "if MyState['job_cnt'] > 0", 'description': 'Rule #1'}, {'targetNodeLabel': 'summary_Prompt', 'condition': 'else', 'description': 'Rule #2'}], 'node_type': 'conditionNode', 'next_node': [{'node_name': 'job_condition', 'node_type': 'conditionNode'}, {'node_name': 'summary_Prompt', 'node_type': 'promptNode'}], 'node_name': 'search_or_result'}
    search_or_result :dict = {}
    job_condition_Config :dict = {'config': [{'targetNodeLabel': 'concept_Prompt', 'condition': "if MyState['job_list'][0] == 'concept'", 'description': 'Rule #1'}, {'targetNodeLabel': 'indicator_Prompt', 'condition': "elif MyState['job_list'][0] == 'indicators'", 'description': 'Rule #2'}, {'targetNodeLabel': 'interpretation_Prompt', 'condition': "elif MyState['job_list'][0] == 'interpretation'", 'description': 'Rule #3'}, {'targetNodeLabel': 'news_prompt', 'condition': "elif MyState['job_list'][0] == 'interpretation'", 'description': 'Rule #4'}, {'targetNodeLabel': 'etc_prompt', 'condition': 'else', 'description': 'Rule #5'}], 'node_type': 'conditionNode', 'next_node': [{'node_name': 'concept_Prompt', 'node_type': 'promptNode'}, {'node_name': 'indicator_Prompt', 'node_type': 'promptNode'}, {'node_name': 'interpretation_Prompt', 'node_type': 'promptNode'}, {'node_name': 'news_prompt', 'node_type': 'promptNode'}, {'node_name': 'etc_prompt', 'node_type': 'promptNode'}], 'node_name': 'job_condition'}
    job_condition :dict = {}
    pop_function_Config :dict = {'config': {'code': "# Write your Python code here\n\ndef aa( state ) :\n    state['result'] += state['agent_response']\n    state['job_list'].pop(0)\n    state['job_cnt'] = len(state['job_list'])\n    return state "}, 'node_type': 'functionNode', 'next_node': [{'node_name': 'search_or_result', 'node_type': 'conditionNode'}], 'node_name': 'pop_function'}
    pop_function :dict = {}
    concept_Prompt_Config :dict = {'config': {'template': '지표에 대한 설명을 읽어들입니다.\n먼저 정확한 지표 이름을 확인하기 위해 `list_concepts`를 호출하세요. 이후 사용자가 원하는 지표 이름과 유사한 것을 골라 `read_indicator_info_from_s3`를 호출합니다.\n이 때, 여러 지표의 설명을 확인하고 싶은 경우 `read_indicator_info_from_s3`를 반복해서 호출합니다.\n만약 유사한 지표 이름이 없다면 `read_indicator_info_from_s3` 툴을 사용하지 않고 일반적인 개념으로 설명합니다.\n\n정보를 가져온 뒤에는 아래 지침을 따릅니다.\n당신은 개념 설명 전문가입니다. 지표의 개념을 아래 구조에 따라 설명합니다:\n1. 정의 (간단하고 명확하게)\n2. 사용하는 맥락 (어디에 사용되는지)\n3. 실제 사례 또는 예시\n\n[쉬운 언어로, 경제/정책 초보도 이해할 수 있게 설명합니다.]'}, 'outputVariable': 'concept_system', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent_concept', 'node_type': 'agentNode'}], 'node_name': 'concept_Prompt'}
    concept_Prompt :dict = {}
    summary_Prompt_Config :dict = {'config': {'template': '오늘의 날짜: {today}(UST)\n\n너는 정보를 정리해서 최대한 자세하게 요약하는 전문가야.\n\n[공통]\n다음 내용을 요약해 줘. 중요 포인트 위주로 정리하고 항목화 해줘.\n답변 내용이 markdown으로 표시되는 점에 유의하여 기간/구간을 뜻하는 물결표시(~)가 들어가면 \\~로 작성해줘.\n만약 아무런 정보가 제공되지 않은 경우, 아래 내용으로 답해줘.\n\n---\n저는 보드 수량 예측 챗봇으로 다음과 같은 내용을 답해드릴 수 있습니다.\n- 뉴스 기사 검색\n- 예측 모델 정보 및 해석 (MDF, PB, 건장재(시판), 준공실적)\n- 지표 관련 정보\n---\n\n\n[뉴스 기사]\n뉴스 기사를 정리할 때는 해당 기사와 일치하는 정확한 링크를 제공해줘. 이 때, html과 markdown 형식을 활용하여 <a href="링크" target="_blank" rel="noopener noreferrer">언론사명: 제목</a>로 작성해줘.\nMSN 뉴스 기사가 제공된 경우, 해당 뉴스는 항상 진실이야. 네멋대로 실존하지 않는 뉴스라고 단정짓지 마.\n만약 뉴스 기사를 찾지 못한 경우, 찾지 못했다고 답변해. 너의 지식 기반 답변으로 링크를 제공하지 마.\n\n\n[예측 모델]\n예측 모델 정보의 경우 상세한 값 기반으로 답변해줘. 단, MAE, MAPE와 같은 표현은 사용자에게 해선 안 돼.\n예측값에 대한 정보 제공 시 실제값과 예측값을 잘 구분해야 해.\nMDF와 PB의 예측 단위는 [m3], 시판의 예측 단위는 [평], 준공실적의 예측 단위는 [호]야. 또, 소수점을 반올림하여 정수로만 표현하며 천단위에 콤마(,) 표시를 넣어줘.\n\n\n[지표]\n지표에 대해 설명할 때 오늘 날짜와 가장 가까운 날짜의 값을 기준으로 설명해줘.\n\n답변 이후 사용자 질문에 이어질 꼬리 질문 세가지를 생성해줘. 이 때, "꼬리 질문"이라는 표현은 넣지 마.\nQ1.\nQ2.\nQ3.'}, 'outputVariable': 'summary_system', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent_summary', 'node_type': 'agentNode'}], 'node_name': 'summary_Prompt'}
    summary_Prompt :dict = {}
    indicator_Prompt_Config :dict = {'config': {'template': '오늘의 날짜: {today}(UST)\n\n사용자가 원하는 지표 이름과 가장 유사한 지표의 값을 읽어들입니다.\n먼저 정확한 지표 이름을 확인하기 위해 `list_indicators`를 호출하세요. 이후 사용자가 원하는 지표 이름과 유사한 것을 골라 `read_indicator_value_from_s3`를 호출합니다.\n이 때, 여러 지표의 값을 확인하고 싶은 경우 `read_indicator_value_from_s3`를 반복해서 호출합니다.\n만약 유사한 지표 이름이 없다면 `read_indicator_value_from_s3` 툴을 사용하지 않고 관련 정보를 찾을 수 없다는 답변을 합니다.\n\n정보를 가져온 뒤, 툴을 통해 얻은 값을 그대로 반환합니다.\n"""\n\n"""\n정보를 가져온 뒤에는 아래 지침을 따릅니다.\n당신은 경제 지표 해석 전문가입니다. 다음을 바탕으로 사용자 질문에 답합니다:\n1. 지표의 정의 및 계산 방식\n2. 현재 또는 최근의 수치 트렌드\n3. 해당 지표가 의미하는 바와 해석 포인트\n4. 월별 값을 반드시 반환합니다. 특정 월(예: 1, 2, 3월 등)만 응답하지 말고, 질문이 포함하는 모든 월에 대해 순서대로 응답해주세요.\n\n[항목별로 정리하며 최근 수치 또는 대표값은 반드시 포함하여 설명합니다.]'}, 'outputVariable': 'indicator_system', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent_2', 'node_type': 'agentNode'}], 'node_name': 'indicator_Prompt'}
    indicator_Prompt :dict = {}
    interpretation_Prompt_Config :dict = {'config': {'template': '다음 데이터는 예측 시점 기준으로 예측 값과 X인자 데이터 입니다.\n[모델 평가지표]는 예측 모델에 대한 평가지표입니다.\n[실제값]은 실제값입니다.\n[예측값]은 모델이 예측한 값입니다.\n[실적과 예측에 사용된 영향인자 값 정보]는 모델이 예측하는데 사용한 X 주요 인자입니다.\n[영향인자 정보]는 변수 중요도와 Target과의 관계 입니다.\n\n<S&OP팀과 영업팀에서 활용하는 정성적 가설>\n- 금리가 상승하면 매출에 부정적 영향을 준다.\n* 시장 재고가 하락하면 수입 유입량이 증가한다\n* 동화 및 동종사의 재고(시장재고)가 높고 판가가 하락하면 판매량이 유지된다\n* 동화 및 동종사의 재고(시장재고)가 높고 판가를 유지하면 판매량이 하락한다\n* 수입량 변화에 따라 특정 동종사 판매량이 유의미하게 변화한다.\n* 수입 PB,MDF 판가가 낮고 동화 판가가 하락하면 판매량이 유지된다\n* 수입 오퍼가와 시장판가간 5% 이상 차이가 나면 수입 유입량이 증가한다.\n\n<주요 데이터 설명>\n- 다음 데이터는 수요 예측을 하는데 사용된 주요 지표들의 명칭과 월별 데이터 값으로 이루어져 있습니다.\n- 모델 생성일자: 예측 모델이 만들어진 날짜로, 해당 날짜에 생성된 모델을 기반으로 예측이 이루어집니다.\n- 예측값: 판매량의 예측값으로, 모델 생성일자에 기반하여 예측한 판매량입니다.\n- 판매량예측년월: 모델 생성일자에 만들어진 모델이 예측을 목표로한 일자(년,월) 입니다. 즉, 예측일자 입니다. ex) 2025-01\n- 영향인자: 판매량 예측에 영향을 미치는 다양한 변수들입니다. 모델은 이 변수들의 값을 기반으로 예측을 생성합니다. 모델이 업데이트될 때마다 이 영향인자 값이 변경될 수 있습니다.\n- 단위: MDF와 PB는 m3, 시판은 평, 준공실적은 호입니다.\n\n당신은 수요 예측을 위한 S&OP 모델을 운영하는 데이터 분석가입니다. 매달 모델은 업데이트되며, 영향인자값이 변경됩니다. 당신은 각 모델에서의 판매량 예측값 변화를 탐지하고, 그 변화를 유발한 영향인자들을 분석하여 해석하는 역할을 담당합니다.\n\n사용자의 질문에 따라 당신은 질문을 분류해서 답변해야 합니다. \n1. 저번달과 이번달의 값을 비교하는 경우\n- 처리 방법 : 모델 생성일자가 동일한 데이터를 기준으로 판매량을 비교 분석합니다.\n예제) \n질문 : 이번달의 판매량이 증가한 이유? \n답변 : 이번달에 생성된 모델에 따르면, 동행종합지수_변동량(3개월전)이 0.2에서 0.4로 증가, 주택시장소비심리지수_변동량(7개월전)가 2.3에서 3.3으로 증가, 선행종합지수_변동량(9개월전)가 0.1에서 0.6으로 증가해서 예측치가 증가해 판매량이 증가할 것으로 예상됩니다.\n\n2. 동일 월(month)에 값의 변경 원인 요청\n- 처리 방법 : 모델 생성일자가 다른 데이터를 기준으로 판매량을 비교 분석합니다.\n예제) \n질문 : 이번달 예측값이 변경된 원인이 무엇입니까? \n답변: 이번달과 지난달 생성된 모델을 비교해 분석해 보면, 지난달 영향인자는 동행종합지수_변동량(3개월전),주택매매시장소비심리지수(7개월전),부동산시장소비심리지수_변동량(8개월전),선행종합지수_변동량(9개월전),연립주택매매거래현황_변동량(9개월전),포틀랜드시멘트_변동량(8개월전) 이고\t\n이번달 영향인자는 동행종합지수_변동량(3개월전),주택매매시장소비심리지수(6개월전),주택시장소비심리지수_변동량(7개월전),선행종합지수_변동량(9개월전),연립주택매매거래현황_변동량(9개월전),포틀랜드시멘트_변동량(8개월전) 입니다\n변화된 인자는 주택매매시장소비심리지수(7개월전), 부동산시장소비심리지수_변동량(8개월전) 대신 주택매매시장소비심리지수(6개월전), 주택시장소비심리지수_변동량(7개월전)이 예측에 사용되었습니다.\n지난달 기준 주택매매시장소비심리지수(7개월전)의 값은 121.8, 부동산시장소비심리지수_변동량(8개월전)의 값은 0.037이번달 기준 주택매매시장소비심리지수(6개월전)의 값은 113.5, 주택시장소비심리지수_변동량(7개월전)은 0.632입니다. 그리고 선행종합지수_변동량(9개월전)의 예측치가 0.18 -> 0.30으로 변경되었습니다.\n\n3. 데이터와 질문이 충돌되는 경우\n- 처리 방법 : 지난달 판매량이 감소(증가)한 이유를 질문했지만, 실제 데이터가 상승(감소)한 경우 사용자에게 질문을 보정해서 답변합니다. \n예제)\n질문 : 지난달 판매량이 감소한 이유가 무엇입니까?\n답변 : 지난달 판매량은 감소하지 않고 실제로는 증가하였습니다. \n\n모든 답변에서 주의사항은 다음과 같습니다. \n1. 사용자 질문과 판매량 예측년월은 반드시 일치해야 합니다. \n2. 특정 일자의 모델 생성일을 말하지 않으면, 반드시 최신 모델기준으로 답변을 만듭니다. \n3. 질문한 날짜와 일치하는 데이터가 없으면 데이터가 없다고 대답해야 합니다(매우 중요).\n\n\n답변형식 : \n- 비교 분석하는 날의 year과 month를 반드시 언급해야 합니다. \n- 답변 시작 시 “OO달에 생성된 모델에 따르면,” 혹은 “OO달과 OO달 생성된 모델을 비교해 분석해 보면,”으로 시작합니다.\n- 답변 내용에 값에 대한 비교 뿐만 아니라 경기 지표에 대한 해석을 포함시켜서 왜 예측값이 상승 혹은 하락 했는지 해석해주는 내용이 포함되어야 합니다. 해석할 때는 일반적인 경제적 상황 뿐만 아니라 S&OP와 영업팀이 활용하는 가설을 고려하면 좋습니다.\n- 모든 값은 소수점 5번째 자리에서 반올림해서 대답합니다.\n- 답변할때 절대 없는 정보를 추측해서 답변하지 말고, 정확한 출처가 있는 데이터만 활용해서 답변합니다.\n- 예측값에 대한 정보 제공 시 **반드시** 월별로 작성하도록 하며, 기준날짜 이후의 예측값 정보를 제공합니다.\n\n[해석 결과를 간결하고 항목별로 정리합니다.]'}, 'outputVariable': 'interpretation_system', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent_4', 'node_type': 'agentNode'}], 'node_name': 'interpretation_Prompt'}
    interpretation_Prompt :dict = {}
    Agent_summary_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'userPromptInputKey': 'result', 'systemPromptInputKey': 'summary_system', 'tools': [], 'agentOutputVariable': 'agent_response', 'maxTokens': 2000, 'node_type': 'agentNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Agent_summary', 'chat_history': []}}
    Agent_summary :dict = {}
    etc_prompt_Config :dict = {'config': {'template': '뉴스 기사를 검색하여 읽는 중입니다...\n\n저는 보드 수량 예측 챗봇으로 다음과 같은 내용을 답해드릴 수 있습니다.\n\n• 뉴스 기사 검색\n\n• 예측 모델 정보 및 해석 (MDF, PB, 건장재(시판), 준공실적)\n\n• 지표 관련 정보\n\n죄송하지만 {question}과 관련된 정보는 제공해드릴 수 없습니다. 야구 일정은 KBO 공식 홈페이지나 각 구단 홈페이지를 통해 확인하시는 것을 추천드립니다.'}, 'outputVariable': 'user_input', 'node_type': 'promptNode', 'next_node': [{'node_name': 'pop_function', 'node_type': 'functionNode'}], 'node_name': 'etc_prompt'}
    etc_prompt :dict = {}
    news_prompt_Config :dict = {'config': {'template': 'Search in KOREAN and query must be string.\nToday is {today}(UST).\nSearch terms should be as specific as possible.\nIn particular, for dates, specify a specific date. DO NOT USE RECENT/최근/최신.\nAfter searching news, you need to write **accurate url** of articles.'}, 'outputVariable': 'new_system', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent_3', 'node_type': 'agentNode'}], 'node_name': 'news_prompt'}
    news_prompt :dict = {}


def return_next_node( my_node, next_node_list, return_value, node_cofing = {} ):
    updates = {}
    for next_node in next_node_list : 
        next_name = next_node['node_name']
        next_type = next_node['node_type']
        
        # merge node 
        if next_type == 'mergeNode':
            if next_name not in updates:
                updates[next_name] = {my_node : return_value}
            else : 
                updates[next_name][my_node] = return_value
        # 일반 노드 
        else : 
            if next_name not in updates:
                updates[next_name] = return_value
                
    updates = updates | node_cofing 
                
    return updates

@log_node_execution("start", "Start", "startNode")
def node_Start(state):
    node_label = "Start" # 노드 레이블을 직접 사용

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다.
    state_dict = state.model_dump()
    
    # 딕셔너리 키 접근 시 .get() 메서드를 사용하여 안전성 확보
    node_input = state_dict.get(node_label, {}) # 키가 없으면 빈 딕셔너리 반환
    
    node_config_key = f"{node_label}_Config"
    full_node_config_data = state_dict.get(node_config_key, {}) # 전체 설정 데이터
    node_config = full_node_config_data.get('config', {}) # 'config' 키의 실제 설정값

    # 다음 노드에 전달하는 값
    # f-string 내 딕셔너리 리터럴은 중괄호를 두 번({ }) 사용해야 합니다.
    return_value = { **node_config, **node_input }
    
    # 전달하고자 하는 타겟 node 리스트
    next_node_list = full_node_config_data.get('next_node', [])
    
    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node(node_label, next_node_list, return_value, return_config)

@log_node_execution("end", "End", "endNode")
def node_End( state ) : 
    my_name = "End" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]['config']['receiveKey']

    # 다음 노드에 전달하는 값 
    return_value = {} 
    if len(node_config) == 1 and node_config[0] == '': 
        return_value = node_input
    else : 
        for key in node_config: 
            return_value[key] = node_input[key] 

    # 결과값 전달
    return_config = { node_config_key : state_dict[node_config_key] }

    next_node_list = [ {'node_name': 'response', 'node_type': 'responseNode'} ]
    return return_next_node( node_name, next_node_list, return_value, return_config )   
    
@log_node_execution("61fmaMNGqjseiZhB7J06t", "Prompt", "promptNode")
def node_Prompt(state):
    my_name = "Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("uK3L50P6Ze_ZyjyHF_y1H", "Agent", "agentNode")
def node_Agent( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_aws import ChatBedrockConverse

    my_name = "Agent" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )
                
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{ "user_prompt" : user_prompt }  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )

def node_Agent_concept( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "Agent_concept" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tool_list = []
    
    

    import boto3

    def read_concepts_info_from_s3(fileName):
        def read_txt_file(bucket_name, fileName):
            response = s3_client.get_object(Bucket=bucket_name, Key=fileName)
            content = response['Body'].read().decode('utf-8')
            return content
        s3_client = boto3.client('s3')
        bucket_name = 'sb-snop-bucket'
        file_key    = f'demand_fcst/data/Chatbot/external_all/{fileName}.txt'
        print(file_key)
        try:
            indicator = read_txt_file(bucket_name, file_key)
            return indicator
        except Exception as e:
            print(e)
            return "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."

    _read_concepts_info_from_s3_tool =  StructuredTool.from_function(
                                                            func=read_concepts_info_from_s3,
                                                            name="read_concepts_info_from_s3",
                                                            description=('''
이 도구는 필수 인자 fileName 통해 경제 지표 설명을 s3에서 가져옵니다.
fileName은 사전에 정의된 리스트에서 선택되어야 하며, 해당 지표명과 일치하는 .txt 파일을 AWS S3 경로에서 읽어와 내용을 반환합니다.

fileName 사용할 수 있는 값은 다음과 같습니다:
가구판매액,  거래활발지수 ,  건설경기실사지수매출전망 ,  건설경기실사지수업황전망 ,  공동주택통합매매실거래가격지수 ,  금리 ,  내구재_지출전망CSI ,  다세대주택매매거래현황 ,  다세대준공실적 ,  다세대착공실적 ,  동행종합지수 ,  목재수입금액지수 ,  목재수입물가지수 ,  목재수입물량지수 ,  민간아파트신규분양세대수 ,  변동형주택담보대출 ,  부동산시장소비심리지수 ,  상하이컨테이너운임지수_SCFI_ ,  선행종합지수 ,  세대수증감률_수도권 ,  소비자동향조사 ,  소비자심리지수 ,  아파트매매실거래가격지수 ,  아파트미분양호수 ,  아파트전세가격지수 ,  아파트주택매매거래현황 ,  아파트준공실적 ,  아파트착공실적 ,  연립다세대매매실거래가격지수 ,  연립다세대전세가격지수 ,  연립준공실적 ,  연립착공실적 ,  원목수입금액지수 ,  원목수입물가지수 ,  원목수입물량지수 ,  인구증감률_수도권 ,  종합전세가격지수 ,  주거비_지출전망CSI ,  주택담보대출금리 ,  주택담보대출금액 ,  주택매매시장소비심리지수 ,  주택시장소비심리지수 ,  주택전세시장소비심리지수 ,  총전입건수 ,  출생아수 ,  포틀랜드시멘트생산자물가지수 ,  혼인건수 ,  후행종합지수 

tool 사용 예시:
사용자 요청: '거래활발지수 지표 설명 보여줘'
도구 호출: read_indicator_info_from_s3('거래활발지수')

사용자 요청: '건설 경기 실사지수 전망 대해 알려줘'
도구 호출: read_indicator_info_from_s3('건설경기실사지수매출전망')

사용자 요청: '내구재 지출전망CSI 관련 지표 설명 줘'
도구 호출: read_indicator_info_from_s3('내구재_지출전망CSI')

주의:
fileName 없으면 지표 검색을 수행할 수 없습니다. 사용자가 질문에서 필요한 fileName 먼저 파악해야 합니다.
fileName 값이 잘못되었거나 S3에 해당 파일이 존재하지 않으면, "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."라는 메시지를 반환합니다.''') 
                                                        )

    tool_list.append( _read_concepts_info_from_s3_tool )         


    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, verbose=False)

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({"user_prompt": user_prompt})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )
    
def node_Agent_2( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "Agent_2" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tool_list = []
    
    

    import boto3

    def read_indicator_value_from_s3(fileName):
        def read_txt_file(bucket_name, file_name):
            response = s3_client.get_object(Bucket=bucket_name, Key=file_name)
            content = response['Body'].read().decode('utf-8')
            return content
        s3_client = boto3.client('s3')
        bucket_name = 'sb-snop-bucket'
        file_key    = f'demand_fcst/view/chat/external/{fileName}.txt'
        print(file_key)
        try:
            indicator = read_txt_file(bucket_name, file_key)
            return indicator
        except Exception as e:
            print(e)
            return "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."

    _read_indicator_value_from_s3_tool =  StructuredTool.from_function(
                                                            func=read_indicator_value_from_s3,
                                                            name="read_indicator_value_from_s3",
                                                            description=('''이 도구는 fileName 이라는 필수 인자를 통해 어떤 경제 지표의 값을 가져올지 알아야 합니다.
fileName 사전에 정의된 리스트에서 선택되어야 하며, 해당 지표명과 일치하는 .txt 파일을 AWS S3 경로에서 읽어와 내용을 반환합니다.

fileName 사용할 수 있는 값은 다음과 같습니다:
SCFI, 가구점개인사업자수, 가구판매액, 거래활발지수, 건설경기실사지수매출전망, 건설경기실사지수업황전망, 건설기성액, 건설수주액, 경제심리지수, 공동주택통합매매실거래가격지수, 광공업생산지수, 금리, 기계류내수출하지수, 내구재 지출전망CSI, 내수출하지수, 다세대주택매매거래현황, 다세대준공실적, 다세대착공실적, 동행종합지수, 목재수입금액지수, 목재수입물가지수, 목재수입물량지수, 미분양호수, 민간아파트신규분양세대수, 변동형주택담보대출, 부동산시장소비심리지수, 비농립어업취업자수, 서비스업생산지수, 선행종합지수, 세대수증감률_수도권, 소매판매액지수, 소비자심리지수, 수입물량_강화마루, 수입물량_합판강마루, 수입액, 수출입물가비율, 신규분양세대수, 아파트매매실거래가격지수, 아파트미분양호수, 아파트전세가격지수, 아파트주택매매거래현황, 아파트준공실적, 아파트착공실적, 연립다세대매매실거래가격지수, 연립다세대전세가격지수, 연립주택매매거래현황, 연립준공실적, 연립착공실적, 원목수입금액지수, 원목수입물가지수, 원목수입물량지수, 인구증감률_수도권, 장단기금리차, 재고순환지표, 종합건설사폐업건수, 종합전세가격지수, 주거비 지출전망CSI, 주택담보대출금리, 주택담보대출금액, 주택매매시장소비심리지수, 주택시장소비심리지수, 주택전세시장소비심리지수, 총전입건수, 출생아수, 코스피, 포틀랜드시멘트, 혼인건수, 환율, 후행종합지수

도구 사용 예시:

사용자 요청: 'SCFI 수치 알려줘'
도구 호출: read_indicator_value_from_s3('SCFI')

사용자 요청: '건설수주액 값이 궁금해'
도구 호출: read_indicator_value_from_s3('건설수주액')

사용자 요청: '내구재 지출전망CSI 최신 값 줘'
도구 호출: read_indicator_value_from_s3('내구재 지출전망CSI')

주의:
fileName 없으면 지표 값을 검색할 수 없습니다. 사용자의 질문에서 필요한 fileName 먼저 파악해야 합니다.
fileName 값이 잘못되었거나 S3에 해당 파일이 존재하지 않으면, "관련 정보를 찾을 수 없습니다. 지표명을 다시 한 번 확인해주세요."라는 메시지를 반환합니다.
''') 
                                                        )

    tool_list.append( _read_indicator_value_from_s3_tool )         


    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, verbose=False)

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({"user_prompt": user_prompt})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )
    
def node_Agent_3( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "Agent_3" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tool_list = []
    
    

    import requests
    from bs4 import BeautifulSoup
    from duckduckgo_search import DDGS
    import time

    def search_news_articles(queries, max_results=3):

        def fetch_page_content(url):
            """주어진 뉴스 기사 URL에서 본문 내용을 크롤링"""
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()  # HTTP 오류 발생 시 예외 처리
                soup = BeautifulSoup(response.text, "html.parser")
    
                # 본문 추출 (일반적인 뉴스/블로그 구조 적용)
                paragraphs = soup.find_all("p")
                content = "\n".join([p.get_text() for p in paragraphs])
                return content.strip()
    
            except requests.RequestException as e:
                print(f"Error fetching {url}: {e}")
                return ''
            
   
        articles = []
        print( type(queries)  )

        if type(queries) == str : 
            query = queries
            for not_use_keyword in ['최근', '최신']:
                query = query.replace(not_use_keyword, '').strip()
        
            try:
                time.sleep(1)  # Ratelimit 방지용 딜레이
                results = DDGS().news(keywords=query, max_results=max_results)
            except Exception as e:
                print(f"[ERROR] DDG 검색 중 오류 발생: {e}")
            
            for res in results:
                url = res.get("url")
                if url:
                    article_content = fetch_page_content(url)  # 본문 크롤링
                    if not article_content:
                        article_content = res.get('body') or '[본문 없음]'
                    source = res.get('source') or '[출처 없음]'
                    title = res.get("title") or '[제목 없음]'
                    date = res.get("date") or '[날짜 없음]'
                    articles.append(
                        f"쿼리: {query}\n언론사: {source}\n제목: {title} ( {url} )\n날짜: {date}\n\n본문:\n{article_content}\n"
                    )


        if type(queries) == list : 
            for query in queries:
                print(f"[INFO] 검색어: {query}")
                for not_use_keyword in ['최근', '최신']:
                    query = query.replace(not_use_keyword, '').strip()
    
                try:
                    time.sleep(1)  # Ratelimit 방지용 딜레이
                    results = DDGS().news(keywords=query, max_results=max_results)
                except Exception as e:
                    print(f"[ERROR] DDG 검색 중 오류 발생: {e}")
                    continue
    
                for res in results:
                    url = res.get("url")
                    if url:
                        article_content = fetch_page_content(url)  # 본문 크롤링
                        if not article_content:
                            article_content = res.get('body') or '[본문 없음]'
                        source = res.get('source') or '[출처 없음]'
                        title = res.get("title") or '[제목 없음]'
                        date = res.get("date") or '[날짜 없음]'
                        articles.append(
                            f"쿼리: {query}\n언론사: {source}\n제목: {title} ( {url} )\n날짜: {date}\n\n본문:\n{article_content}\n"
                        )

        return articles


    _search_news_articles_tool =  StructuredTool.from_function(
                                                            func=search_news_articles,
                                                            name="search_news_articles",
                                                            description=('''뉴스 기사 검색 도구입니다.
이 도구는 찾고자 하는 키워드를 list에 넣어, 입뉴스를 검색합니다.
queries는 하나 이상의 검색어(키워드)로 구성된 list이며, 각 검색어에 대해 뉴스 기사를 최대 3개까지 수집합니다.

도구 사용 예시:
사용자 요청: "최근 아파트 분양 관련 뉴스 보여줘"
도구 호출: search_news_articles(queries=["아파트 분양", "2025년 3월 아파트 분양 건수"])
사용자 요청: "목재 수입 동향에 대한 뉴스 기사 찾아줘"
도구 호출: search_news_articles(queries=["목재 수입 동향"])
사용자 요청: "주택 시장 전망과 금리에 대한 뉴스 검색해줘"
도구 호출: search_news_articles(queries=["주택 시장 전망", "금리"])

내부 처리 방식 요약:
입력된 검색어 각각에 대해 뉴스 검색을 수행합니다.
각 뉴스 결과에 대해 URL 본문을 직접 크롤링하여 주요 내용을 추출합니다.
본문이 없거나 URL에 접근이 실패한 경우, 제공된 요약 또는 "[본문 없음]"으로 대체됩니다.

주의:
키워드는 반드시 리스트에 담아서 전달해야 합니다. 예를 들어 ["부동산 시장 동향" ]
queries가 빈 리스트이거나 문자열이 아닌 값이 포함되면 검색이 수행되지 않습니다.''') 
                                                        )

    tool_list.append( _search_news_articles_tool )         


    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, verbose=False)

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({"user_prompt": user_prompt})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )
    
def node_Agent_4( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "Agent_4" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tool_list = []
    
    
    import boto3

    def model_analysis_tool(boardCategory : str = "MDF", yyyymm: str = "", prodType: str = "전체") -> str:
        s3_client = boto3.client('s3')
        print( '######## model_analysis #########' ) 
        print( 'boardCategory  : ', type(boardCategory ) ) 
        print( 'boardCategory  : ', boardCategory  ) 
        print( 'yyyymm : ', yyyymm ) 
        print( 'prodType : ', prodType ) 
    

        def read_txt_file(bucket_name, file_name):
            s3_client = boto3.client('s3')
            response = s3_client.get_object(Bucket=bucket_name, Key=file_name)
            content = response['Body'].read().decode('utf-8')
            return content
        
        def read_summary_file_from_s3(boardCategory, yyyymm, prodType):
            bucket_name = 'sb-snop-bucket'
            if boardCategory == 'MDF':
                prodType = f'MDF_판매량_{prodType}'
            elif boardCategory == 'PB':
                prodType = f'PB_판매량_{prodType}'
            elif boardCategory == '시판':
                prodType = f'시판_판매량_{prodType}'
            elif boardCategory == '준공실적':
                prodType = '아파트준공실적'
    
            file_key = f'demand_fcst/view/{boardCategory}/{yyyymm}/{prodType}/chat_txt.txt'
            print(file_key)
            try:
                summary = read_txt_file(bucket_name, file_key)
                return summary
            except Exception as e:
                print(e)
                return "관련 정보를 찾을 수 없습니다. 제품명, 기준년월 및 상세품목을 다시 한 번 확인해주세요."
    
            # 폴더 가지고 오기
        def list_s3_folders(bucket_name, prefix):
            """
            List folders (prefixes) in an S3 bucket under a specific prefix
        
            Args:
                bucket_name (str): Name of the S3 bucket
                prefix (str): Path prefix to list folders from
            """    
            # Ensure prefix ends with '/'
            if not prefix.endswith('/'):
                prefix += '/'
        
            # Use paginator to handle cases with many objects
            paginator = s3_client.get_paginator('list_objects_v2')
        
            # Set delimiter to '/' to get folder-like behavior
            page_iterator = paginator.paginate(
                Bucket=bucket_name,
                Prefix=prefix,
                Delimiter='/'
            )
        
            folders = []
        
            try:
                for page in page_iterator:
                    # Get common prefixes (folders)
                    if 'CommonPrefixes' in page:
                        for prefix_obj in page['CommonPrefixes']:
                            # Remove the base prefix to get just the folder name
                            folder_path = prefix_obj['Prefix']
                            folder_name = folder_path.rstrip('/').split('/')[-1]
                            folders.append(folder_name)
                        
                return folders
            
            except Exception as e:
                print(f"Error listing folders: {str(e)}")
                return []
    
        def list_yyyymm_by_boardCategory(boardCategory):
            max_to_show = 3
    
            bucket_name = "sb-snop-bucket"
            folder_path = f'demand_fcst/view/{boardCategory}'
        
            folders = sorted(list_s3_folders(bucket_name, folder_path), reverse=True)[:max_to_show]
            print( folders )
        
            if folders:
                return folders

        # boardCategory 알려주지 않으면 무조건 MDF로 답변한다. 
        if boardCategory == ''  : 
            boardCategory = 'MDF'

        # 타입을 주지 않으면 무조건 전체로 답변한다. 
        if prodType == '' : 
            if boardCategory == 'MDF':
                prodType = 'MDF_판매량_전체'
            elif boardCategory == 'PB':
                prodType = 'PB_판매량_전체'
            elif boardCategory == '시판':
                prodType = '시판_판매량_전체'
            elif boardCategory == '준공실적':
                prodType = '아파트준공실적'
            else : 
                prodType = 'MDF_판매량_전체'
    
        # 기간을 알려주지 않으면, 최산 데이터로 답변한다. 
        if yyyymm == '' :
            yyyymm = list_yyyymm_by_boardCategory( boardCategory )[0]

    
        return read_summary_file_from_s3(boardCategory, yyyymm, prodType)

    _model_analysis_tool_tool =  StructuredTool.from_function(
                                                            func=model_analysis_tool,
                                                            name="model_analysis_tool",
                                                            description=('''이 도구는 보드 수요 예측 분석 결과를 제공합니다. 사용하려면 세 가지 인자를 반드시 입력해야 합니다.

첫 번째 인자: 보드 종류인 boardCategory 이며, 가능한 값은 'MDF', 'PB', '시판', '준공실적'입니다.
두 번째 인자: 분석 기준 연월인 yyyymm으로, '202407'처럼 6자리 숫자 형식이어야 합니다.
세 번째 인자: 세부 품목 유형인 prodType이며, boardCategory 에 따라 선택 가능한 값이 다릅니다.

boardCategory 별 prodType 값은 다음과 같습니다.
MDF: D, DI, DL, R, R+D, 전체
PB: E0(13), E0(15), E0(8), E1(13), E1(8), 전체

시판: 강마루, 강화마루, 벽장재, 진, 전체
준공실적: 아파트준공실적 (고정값)
입력값이 제공되지 않을 경우 기본값은 다음과 같습니다.

boardCategory 가 없으면 'MDF'
prodType이 없으면 '전체'
yyyymm이 없거나 명확하지 않으면 빈 문자열('')로 전달합니다.

사용 예시는 다음과 같습니다.
"PB 2024년 07 분석 내용 보여줘" →model_analysis('PB', '202407', '전체')

"MDF DL 예상 판매량 알려줘" →model_analysis('MDF', '', 'DL')

"수요예측 결과 알려줘" →model_analysis('MDF', '', '전체')

"2025년 3월 MDF DL 예상 판매량 알려줘" →model_analysis('준공실적', '202503', '')

"이번달 MDF DL 예상 판매량 알려줘" →model_analysis('준공실적', '', '')

주의사항:
yyyymm은 반드시 6자리 숫자 형식이어야 하며, 그렇지 않으면 오류가 발생할 수 있습니다.
파라미터를 반드시 3개를 던져야 합니다. ''') 
                                                        )

    tool_list.append( _model_analysis_tool_tool )         


    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, verbose=False)

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({"user_prompt": user_prompt})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )
    
@log_node_execution("VSJyRQ1Eixy-i9Y-r7SP7", "ready_function", "functionNode")
def node_ready_function(state):
    my_name = "ready_function"
    node_name = my_name
    node_config_key = my_name + "_Config"

    state_dict  = state.model_dump()

    # Write your Python code here
    import datetime

    def str_to_list( state ): 
        today = datetime.datetime.now()
        agent_response = state['agent_response'].replace(" ","").split(",")
        state['job_list'] = agent_response
        # state['job_list'] = ['concept']
        state['job_cnt'] = len(agent_response)
        state['today'] = str( today )

        return state

    # 함수 실행
    input_param = state_dict[node_name ] 
    result = str_to_list( input_param ) 
    
    node_config = state_dict[node_config_key]

    return_config = { node_config_key : state_dict[node_config_key] }    
    next_node_list = node_config.get('next_node', []) 

    return return_next_node( node_name, next_node_list, result, return_config ) 


def node_branch_search_or_result(state):
    my_name = "search_or_result"
    node_name = my_name
    node_config = my_name + "_Config"

    state_dict  = state.model_dump()

    def tmp_search_or_result(MyState) :
        if MyState['job_cnt'] > 0 : 
            return "Rule #1"

        else : 
            return "Rule #2"


    # 함수 실행
    input_param = state_dict[node_name] 
    return tmp_search_or_result( input_param ) 
    

def node_search_or_result(state):
    my_name = "search_or_result"
    node_name = my_name
    node_config_key = my_name + "_Config"
    state_dict  = state.model_dump()

    def tmp_search_or_result(MyState) :
        if MyState['job_cnt'] > 0 : 
            return return_next_node( node_name, [{'node_name': 'job_condition', 'node_type': 'conditionNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 

        else : 
            return return_next_node( node_name, [{'node_name': 'summary_Prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 


    # 함수 실행
    input_param = state_dict[node_name] 
    return tmp_search_or_result( input_param ) 
    

def node_branch_job_condition(state):
    my_name = "job_condition"
    node_name = my_name
    node_config = my_name + "_Config"

    state_dict  = state.model_dump()

    def tmp_job_condition(MyState) :
        if MyState['job_list'][0] == 'concept' : 
            return "Rule #1"

        elif MyState['job_list'][0] == 'indicators' : 
            return "Rule #2"

        elif MyState['job_list'][0] == 'interpretation' : 
            return "Rule #3"

        elif MyState['job_list'][0] == 'interpretation' : 
            return "Rule #4"

        else : 
            return "Rule #5"


    # 함수 실행
    input_param = state_dict[node_name] 
    return tmp_job_condition( input_param ) 
    

def node_job_condition(state):
    my_name = "job_condition"
    node_name = my_name
    node_config_key = my_name + "_Config"
    state_dict  = state.model_dump()

    def tmp_job_condition(MyState) :
        if MyState['job_list'][0] == 'concept' : 
            return return_next_node( node_name, [{'node_name': 'concept_Prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 

        elif MyState['job_list'][0] == 'indicators' : 
            return return_next_node( node_name, [{'node_name': 'indicator_Prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 

        elif MyState['job_list'][0] == 'interpretation' : 
            return return_next_node( node_name, [{'node_name': 'interpretation_Prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 

        elif MyState['job_list'][0] == 'interpretation' : 
            return return_next_node( node_name, [{'node_name': 'news_prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 

        else : 
            return return_next_node( node_name, [{'node_name': 'etc_prompt', 'node_type': 'promptNode'}], MyState, { node_config_key : state_dict[node_config_key] } ) 


    # 함수 실행
    input_param = state_dict[node_name] 
    return tmp_job_condition( input_param ) 
    

@log_node_execution("ZN8Vzy75Sd8Dz2QLnkqwF", "pop_function", "functionNode")
def node_pop_function(state):
    my_name = "pop_function"
    node_name = my_name
    node_config_key = my_name + "_Config"

    state_dict  = state.model_dump()

    # Write your Python code here

    def aa( state ) :
        state['result'] += state['agent_response']
        state['job_list'].pop(0)
        state['job_cnt'] = len(state['job_list'])
        return state 

    # 함수 실행
    input_param = state_dict[node_name ] 
    result = aa( input_param ) 
    
    node_config = state_dict[node_config_key]

    return_config = { node_config_key : state_dict[node_config_key] }    
    next_node_list = node_config.get('next_node', []) 

    return return_next_node( node_name, next_node_list, result, return_config ) 


@log_node_execution("b_VRIB1PLl9b_LColypBa", "concept_Prompt", "promptNode")
def node_concept_Prompt(state):
    my_name = "concept_Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("Tz1ubeWayjGOvtBym6bg_", "summary_Prompt", "promptNode")
def node_summary_Prompt(state):
    my_name = "summary_Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("iKIMvI4_seWrlbEdR7fBg", "indicator_Prompt", "promptNode")
def node_indicator_Prompt(state):
    my_name = "indicator_Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("Mf3ak_8R1o9w_T8p6gIul", "interpretation_Prompt", "promptNode")
def node_interpretation_Prompt(state):
    my_name = "interpretation_Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("tFIZlClfOP3gBy0lUZ_gg", "Agent_summary", "agentNode")
def node_Agent_summary( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_aws import ChatBedrockConverse

    my_name = "Agent_summary" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )
                
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{ "user_prompt" : user_prompt }  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )

@log_node_execution("koUmz0QONotYBWRP1yHIe", "etc_prompt", "promptNode")
def node_etc_prompt(state):
    my_name = "etc_prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("EnDq8i2UirTsHSazLVRMj", "news_prompt", "promptNode")
def node_news_prompt(state):
    my_name = "news_prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

graph = StateGraph(MyState)
graph.add_node("_Start", node_Start)
graph.add_node("_End", node_End)
graph.add_node("_Prompt", node_Prompt)
graph.add_node("_Agent", node_Agent)
graph.add_node("_Agent_concept", node_Agent_concept)
graph.add_node("_Agent_2", node_Agent_2)
graph.add_node("_Agent_3", node_Agent_3)
graph.add_node("_Agent_4", node_Agent_4)
graph.add_node("_ready_function", node_ready_function)
graph.add_node("_search_or_result", node_search_or_result)
graph.add_conditional_edges("_search_or_result", node_branch_search_or_result, {'Rule #1': '_job_condition', 'Rule #2': '_summary_Prompt'}  )
graph.add_node("_job_condition", node_job_condition)
graph.add_conditional_edges("_job_condition", node_branch_job_condition, {'Rule #1': '_concept_Prompt', 'Rule #2': '_indicator_Prompt', 'Rule #3': '_interpretation_Prompt', 'Rule #4': '_news_prompt', 'Rule #5': '_etc_prompt'}  )
graph.add_node("_pop_function", node_pop_function)
graph.add_node("_concept_Prompt", node_concept_Prompt)
graph.add_node("_summary_Prompt", node_summary_Prompt)
graph.add_node("_indicator_Prompt", node_indicator_Prompt)
graph.add_node("_interpretation_Prompt", node_interpretation_Prompt)
graph.add_node("_Agent_summary", node_Agent_summary)
graph.add_node("_etc_prompt", node_etc_prompt)
graph.add_node("_news_prompt", node_news_prompt)

graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Prompt")
graph.add_edge("_Prompt", "_Agent")
graph.add_edge("_Agent", "_ready_function")
graph.add_edge("_Agent_4", "_pop_function")
graph.add_edge("_Agent_2", "_pop_function")
graph.add_edge("_ready_function", "_search_or_result")
graph.add_edge("_Agent_concept", "_pop_function")
graph.add_edge("_Agent_3", "_pop_function")
graph.add_edge("_concept_Prompt", "_Agent_concept")
graph.add_edge("_indicator_Prompt", "_Agent_2")
graph.add_edge("_summary_Prompt", "_Agent_summary")
graph.add_edge("_Agent_summary", "_End")
graph.add_edge("_interpretation_Prompt", "_Agent_4")
graph.add_edge("_pop_function", "_search_or_result")
graph.add_edge("_news_prompt", "_Agent_3")
graph.add_edge("_etc_prompt", "_pop_function")
graph.add_edge("_End", END)
checkpointer = InMemorySaver()
app = graph.compile(checkpointer=checkpointer)


# 배포 실행 함수 (로컬 실행)
def run_deployment_e55f9361_e05e_4826_8662_ae312b9a7a7b(input_data):
    try:
        result = app.invoke(input_data, {"configurable": {"thread_id": 1}})
        return {
            "success": True,
            "deployment_id": "e55f9361-e05e-4826-8662-ae312b9a7a7b",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "deployment_id": "e55f9361-e05e-4826-8662-ae312b9a7a7b",
            "error": str(e)
        }

# API를 통한 배포 실행 함수
def run_deployment_via_api(input_data):
    import requests
    import json
    
    url = "http://localhost:8000/api/deployment/e55f9361-e05e-4826-8662-ae312b9a7a7b/run"
    
    payload = {
        "input_data": input_data
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("success"):
            print("Deployment execution successful:", result["result"])
            return result["result"]
        else:
            print("Deployment execution failed:", result.get("error"))
            raise Exception(result.get("error"))
            
    except requests.exceptions.RequestException as e:
        print("API call error:", e)
        raise e

# 사용 예시
if __name__ == "__main__":
    try:
        # API를 통한 실행
        result = run_deployment_via_api("Hello! This is a test message.")
        print("Result:", result)
    except Exception as e:
        print("Error:", e)

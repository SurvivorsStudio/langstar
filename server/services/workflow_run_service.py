"""
워크플로우 서버 실행(Run) 서비스

빌더의 Run 버튼으로 시작한 워크플로우를 서버 백그라운드 스레드에서 끝까지 실행합니다.
브라우저 창을 닫거나 페이지를 이동해도 실행은 계속되며, 실행 상태/이력은
workflow_runs/{run_id}.json 파일로 저장되어 언제든 다시 조회할 수 있습니다.

실행 스케줄링 규칙은 프론트엔드 실행 엔진(ui/src/services/execution/executionEngine.ts)과 동일합니다.
- 완료 시점 기반 스케줄링: 노드가 끝나면 그 하류만 검사해 즉시 실행
- Merge 노드: 모든 입력 엣지에 데이터가 준비되어야 실행
- Condition convergence 노드: 입력 엣지 중 하나만 준비되어도 실행
"""

import copy
import json
import logging
import os
import threading
import time
import traceback
import uuid
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from server.models.workflow import PromptNodeInput
from server.services.workflow_service import WorkflowService

logger = logging.getLogger(__name__)

PENDING = "PENDING"

MAX_NODE_EXECUTIONS = 100
MAX_MERGE_WAIT_ATTEMPTS = 100
MAX_TOTAL_ITERATIONS = 1000
MAX_PARALLEL_NODES = 8

TERMINAL_STATUSES = {"succeeded", "failed", "cancelled"}


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _has_valid_edge_data(output: Any) -> bool:
    """프론트 hasValidEdgeData 와 동일: PENDING/None 이 아닌 객체(dict/list)만 유효"""
    return isinstance(output, (dict, list))


def _js_truthy(value: Any) -> bool:
    """JS 의 truthy 판정 ({} 와 [] 도 true)"""
    if isinstance(value, (dict, list)):
        return True
    return bool(value)


def _is_error_output(output: Any) -> bool:
    return isinstance(output, dict) and bool(output.get("error"))


def _convert_to_python_notation(key_path: str) -> str:
    """프론트 convertToPythonNotation 과 동일: "a.b.c[0]" -> "a['b']['c'][0]" """
    if not key_path or not key_path.strip():
        return key_path
    parts = key_path.split(".")
    if len(parts) == 1:
        return key_path
    result = parts[0]
    for part in parts[1:]:
        bracket = part.find("[")
        if bracket > 0 and part.endswith("]"):
            result += f"['{part[:bracket]}']{part[bracket:]}"
        else:
            result += f"['{part}']"
    return result


def _generate_start_node_output(node: Dict[str, Any]) -> Dict[str, Any]:
    """프론트 generateStartNodeOutput 과 동일"""
    config = (node.get("data") or {}).get("config") or {}
    variables = []
    for variable in config.get("variables") or []:
        default_value = variable.get("defaultValue")
        var_type = variable.get("type")
        if var_type == "int":
            if not isinstance(default_value, (int, float)):
                try:
                    default_value = int(str(default_value).strip())
                except (TypeError, ValueError):
                    default_value = 0
        elif var_type == "float":
            if not isinstance(default_value, (int, float)):
                try:
                    default_value = float(str(default_value).strip())
                except (TypeError, ValueError):
                    default_value = 0.0
        elif var_type == "list":
            if not isinstance(default_value, list):
                try:
                    default_value = json.loads(default_value or "[]")
                except (TypeError, ValueError):
                    default_value = []
        elif var_type == "dict":
            if not isinstance(default_value, dict):
                try:
                    default_value = json.loads(default_value or "{}")
                except (TypeError, ValueError):
                    default_value = {}
        else:
            default_value = default_value or ""
        variables.append({
            "variableName": variable.get("name"),
            "variableType": var_type,
            "defaultValue": default_value,
            "selectVariable": variable.get("selectVariable"),
        })
    return {
        "className": config.get("className") or "",
        "classType": config.get("classType") or "TypedDict",
        "variables": variables,
    }


class RunCancelled(Exception):
    pass


def _find_reusable_nodes(nodes: List[Dict], edges: List[Dict], prev: Dict[str, Any]) -> Set[str]:
    """이전 실행에서 재사용 가능한 노드를 찾습니다.

    성공한 노드 중, 데이터를 받은 입력 엣지의 출발 노드가 모두 재사용 가능한 노드만 재사용합니다.
    (실패 노드의 에러 출력을 받아 '성공'한 하류 노드는 다시 실행)
    """
    prev_nodes = prev.get("node_states") or {}
    prev_edges = prev.get("edge_states") or {}
    reusable: Set[str] = set()
    changed = True
    while changed:
        changed = False
        for node in nodes:
            node_id = node["id"]
            if node_id in reusable or (prev_nodes.get(node_id) or {}).get("status") != "succeeded":
                continue
            fed_by = [
                e["source"] for e in edges
                if e.get("target") == node_id
                and _has_valid_edge_data((prev_edges.get(e["id"]) or {}).get("output"))
            ]
            if all(source in reusable for source in fed_by):
                reusable.add(node_id)
                changed = True
    return reusable


class WorkflowRun:
    """단일 워크플로우 실행. 그래프 스냅샷과 실행 상태를 보관하고 백그라운드에서 실행합니다."""

    def __init__(self, service: "WorkflowRunService", record: Dict[str, Any], nodes: List[Dict], edges: List[Dict]):
        self.service = service
        self.record = record
        self.nodes: Dict[str, Dict] = {n["id"]: n for n in nodes}
        self.node_list = nodes
        self.edges = edges
        self.lock = threading.RLock()
        self.cancel_event = threading.Event()
        # 이어서 실행하는 경우 재사용한 엣지보다 최신 타임스탬프가 되도록 이어서 증가
        self._seq = max([s.get("timestamp") or 0 for s in record["edge_states"].values()] or [0])

    # ------------------------------------------------------------------
    # 상태 기록 헬퍼 (모두 self.lock 안에서 호출)
    # ------------------------------------------------------------------
    def _touch(self, persist: bool = True):
        self.record["version"] += 1
        self.record["updated_at"] = _now_iso()
        if persist:
            self.service._save(self.record)

    def _next_ts(self) -> int:
        self._seq += 1
        return self._seq

    def _edge_state(self, edge_id: str) -> Dict[str, Any]:
        return self.record["edge_states"][edge_id]

    def _node_state(self, node_id: str) -> Dict[str, Any]:
        return self.record["node_states"][node_id]

    def _set_edge_output(self, edge_id: str, output: Any):
        state = self._edge_state(edge_id)
        state["output"] = output
        state["timestamp"] = self._next_ts() if _js_truthy(output) else 0

    def _set_edge_status(self, edge_id: str, status: str):
        self._edge_state(edge_id)["status"] = status

    def _add_event(self, event_type: str, node_id: Optional[str] = None, message: Optional[str] = None):
        event = {"ts": _now_iso(), "type": event_type}
        if node_id:
            event["node_id"] = node_id
            event["node_label"] = self._label(node_id)
        if message:
            event["message"] = message
        self.record["events"].append(event)

    def _label(self, node_id: str) -> str:
        node = self.nodes.get(node_id) or {}
        return (node.get("data") or {}).get("label") or node.get("type") or node_id

    def _outgoing(self, node_id: str) -> List[Dict]:
        return [e for e in self.edges if e.get("source") == node_id]

    def _incoming(self, node_id: str) -> List[Dict]:
        return [e for e in self.edges if e.get("target") == node_id]

    # ------------------------------------------------------------------
    # 그래프 유틸 (프론트 edgeValidation 과 동일)
    # ------------------------------------------------------------------
    def _has_path(self, target_id: str, source_id: str) -> bool:
        """target 에서 source 로 가는 경로가 있는지 (DFS)"""
        visited: Set[str] = set()
        stack = [target_id]
        while stack:
            current = stack.pop()
            if current == source_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            stack.extend(e["target"] for e in self.edges if e.get("source") == current)
        return False

    def _find_condition_in_path(self, node_id: str, visited: Set[str]) -> Optional[str]:
        if node_id in visited:
            return None
        visited = visited | {node_id}
        node = self.nodes.get(node_id)
        if node and node.get("type") == "conditionNode":
            return node_id
        for parent in self._incoming(node_id):
            found = self._find_condition_in_path(parent["source"], visited)
            if found:
                return found
        return None

    def _is_condition_convergence(self, node_id: str) -> bool:
        node = self.nodes.get(node_id)
        if node and node.get("type") == "mergeNode":
            return False
        incoming = self._incoming(node_id)
        if len(incoming) < 2:
            return False
        condition_ids = set()
        from_condition = 0
        for edge in incoming:
            found = self._find_condition_in_path(edge["source"], set())
            if found:
                condition_ids.add(found)
                from_condition += 1
        if not condition_ids or from_condition != len(incoming):
            return False
        sources = [e["source"] for e in incoming]
        for i in range(len(sources)):
            for j in range(i + 1, len(sources)):
                if self._has_path(sources[j], sources[i]) or self._has_path(sources[i], sources[j]):
                    return False
        return True

    # ------------------------------------------------------------------
    # 단일 노드 실행
    # ------------------------------------------------------------------
    def _collect_input(self, node_id: str) -> Dict[str, Any]:
        """가장 최근에 데이터가 도착한 입력 엣지의 출력을 입력으로 사용"""
        candidates = []
        for edge in self._incoming(node_id):
            state = self._edge_state(edge["id"])
            if _has_valid_edge_data(state["output"]):
                candidates.append((state["timestamp"] or 0, state["output"]))
        if not candidates:
            return {}
        candidates.sort(key=lambda c: c[0], reverse=True)
        return copy.deepcopy(candidates[0][1])

    def _begin_node(self, node_id: str) -> Dict[str, Any]:
        with self.lock:
            node = self.nodes[node_id]
            state = self._node_state(node_id)
            state["status"] = "running"
            state["is_executing"] = True
            state["started_at"] = _now_iso()
            state["ended_at"] = None
            state["exec_count"] += 1
            if node.get("type") != "conditionNode":
                for edge in self._outgoing(node_id):
                    self._set_edge_status(edge["id"], "executing")
            node_input = self._collect_input(node_id)
            state["input"] = node_input
            self._add_event("node_started", node_id)
            self._touch()
            # 실행자에 넘길 엣지 스냅샷 (merge 노드가 사용)
            edge_outputs = {eid: copy.deepcopy(s["output"]) for eid, s in self.record["edge_states"].items()}
            return {"input": node_input, "edge_outputs": edge_outputs}

    def _finish_node(self, node_id: str, result: Dict[str, Any], started: float):
        with self.lock:
            node = self.nodes[node_id]
            node_type = node.get("type")
            output = result.get("output")
            success = bool(result.get("success"))
            is_waiting = isinstance(output, dict) and output.get("status") == "waiting"

            if node_type == "conditionNode":
                for edge_id, edge_output in (result.get("edge_outputs") or {}).items():
                    self._set_edge_output(edge_id, edge_output)
            else:
                for edge in self._outgoing(node_id):
                    self._set_edge_output(edge["id"], output)

            for edge in self._outgoing(node_id):
                if node_type == "conditionNode":
                    if success and _js_truthy(self._edge_state(edge["id"])["output"]):
                        self._set_edge_status(edge["id"], "success")
                else:
                    self._set_edge_status(edge["id"], "success" if success else "failure")

            state = self._node_state(node_id)
            state["output"] = output
            state["is_executing"] = False
            state["ended_at"] = _now_iso()
            state["duration_ms"] = int((time.time() - started) * 1000)
            if is_waiting:
                state["status"] = "waiting"
            else:
                state["status"] = "succeeded" if success else "failed"
            state["error"] = output.get("error") if _is_error_output(output) else None
            self._add_event(
                "node_completed" if success else ("node_waiting" if is_waiting else "node_failed"),
                node_id,
                state["error"],
            )
            self._touch()

    def _execute_node(self, node_id: str) -> Any:
        """노드 하나를 실행하고 출력값을 반환합니다. (워커 스레드에서 실행)"""
        started = time.time()
        prepared = self._begin_node(node_id)
        try:
            result = self._run_executor(self.nodes[node_id], prepared["input"], prepared["edge_outputs"])
        except Exception as e:
            logger.error(f"[WorkflowRun {self.record['id']}] node {node_id} failed: {e}", exc_info=True)
            result = {"success": False, "output": {"error": "Execution failed", "details": str(e)}}
        if self.cancel_event.is_set():
            raise RunCancelled()
        self._finish_node(node_id, result, started)
        return result.get("output")

    # ------------------------------------------------------------------
    # 노드 타입별 실행자 (프론트 nodeExecutors 와 동일한 페이로드 구성)
    # ------------------------------------------------------------------
    def _run_executor(self, node: Dict, node_input: Dict[str, Any], edge_outputs: Dict[str, Any]) -> Dict[str, Any]:
        node_type = node.get("type")
        data = node.get("data") or {}
        config = data.get("config") or {}

        if node_type == "startNode":
            output = WorkflowService.process_start_node(_generate_start_node_output(node))
            return {"success": True, "output": output}

        if node_type == "promptNode":
            output_variable = config.get("outputVariable") or ""
            if not output_variable:
                return {"success": False, "output": {"error": "Output variable name is required"}}
            output = WorkflowService.process_prompt_node(PromptNodeInput(
                prompt=config.get("template") or "",
                param=node_input,
                return_key=output_variable,
            ))
            return {"success": not _is_error_output(output), "output": output}

        if node_type == "functionNode":
            code = data.get("code") or ""
            if not code.strip():
                return {"success": False, "output": {"error": "Python code is empty"}}
            output = WorkflowService.process_python_node({
                "py_code": code,
                "param": node_input,
                "return_key": config.get("outputVariable") or "python_function_output",
            })
            return {"success": not _is_error_output(output), "output": output}

        if node_type == "userNode":
            return self._run_user_node(data, config, node_input)

        if node_type == "agentNode":
            return self._run_agent_node(config, node_input)

        if node_type == "conditionNode":
            return self._run_condition_node(node, node_input)

        if node_type == "mergeNode":
            return self._run_merge_node(node, config, edge_outputs)

        if node_type == "loopNode":
            repetitions = config.get("repetitions") or 1
            return {"success": True, "output": {
                "message": f"Loop will execute {repetitions} times",
                "repetitions": repetitions,
                "currentIteration": 0,
                "input": node_input,
            }}

        if node_type == "endNode":
            return {"success": True, "output": node_input}

        raise ValueError(f"No executor found for node type: {node_type}")

    def _run_user_node(self, data: Dict, config: Dict, node_input: Dict[str, Any]) -> Dict[str, Any]:
        code = data.get("code") or ""
        if not code.strip():
            return {"success": False, "output": {"error": "Python code is empty"}}
        output_variable = config.get("outputVariable") or "result"
        settings = config.get("settings") or {}
        parameters = []
        for param in config.get("parameters") or []:
            input_type = param.get("inputType")
            if input_type == "select box":
                match_data = (config.get("inputData") or {}).get(param.get("name")) or ""
            elif input_type in ("text box", "radio button"):
                match_data = settings.get(param.get("name")) or ""
            elif input_type == "checkbox":
                match_data = settings.get(param.get("name")) or []
            else:
                match_data = ""
            parameters.append({**param, "matchData": match_data})
        response = WorkflowService.process_user_node({
            "code": code,
            "functionName": config.get("functionName") or "user_function",
            "parameters": parameters,
            "inputData": node_input,
            "return_key": output_variable,
        })
        if _is_error_output(response):
            return {"success": False, "output": {"error": response["error"], "details": response.get("details")}}
        return {"success": True, "output": {**node_input, output_variable: response}}

    def _run_agent_node(self, config: Dict, node_input: Dict[str, Any]) -> Dict[str, Any]:
        model = config.get("model")
        if not isinstance(model, dict):
            return {"success": False, "output": {"error": "Agent model is not configured correctly."}}
        system_key = config.get("systemPromptInputKey")
        user_key = config.get("userPromptInputKey")
        if not system_key or not user_key:
            msg = "System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다."
            return {"success": False, "output": {
                "error": msg,
                "systemPromptInputKey": system_key or None,
                "userPromptInputKey": user_key or None,
            }}

        model_for_api = {
            "connName": model.get("name"),
            "providerName": model.get("provider"),
            "modelName": model.get("model"),
        }
        if (model.get("provider") or "").lower() == "aws":
            model_for_api.update({
                "accessKeyId": model.get("accessKeyId"),
                "secretAccessKey": model.get("secretAccessKey"),
                "region": model.get("region"),
            })
        else:
            model_for_api["apiKey"] = model.get("apiKey")

        def _or(value, default):
            return default if value is None else value

        groups = []
        tools_memory = next((n for n in self.node_list if n.get("type") == "toolsMemoryNode"), None)
        if tools_memory:
            groups = ((tools_memory.get("data") or {}).get("config") or {}).get("groups") or []

        memory_group = config.get("memoryGroup")
        memory_type = memory_group_name = memory_window_size = None
        if memory_group:
            group = next((g for g in groups if g.get("id") == memory_group), None)
            if group and group.get("type") == "memory":
                memory_type = group.get("memoryType") or "ConversationBufferMemory"
                if memory_type == "ConversationBufferWindowMemory":
                    memory_window_size = group.get("windowSize") or 5
                memory_group_name = group.get("name")

        tools = []
        selected_tools = config.get("tools") if isinstance(config.get("tools"), list) else []
        for tool_id in selected_tools:
            group = next((g for g in groups if g.get("id") == tool_id), None)
            if group and group.get("type") == "tools":
                tools.append({
                    "tool_name": group.get("name") or "Unnamed Tool",
                    "tool_description": group.get("description") or "No description",
                    "tool_code": group.get("code") or "",
                })

        output_variable = config.get("agentOutputVariable") or "agent_response"
        payload = {
            "model": model_for_api,
            "modelSetting": {
                "topK": _or(config.get("topK"), 40),
                "topP": _or(config.get("topP"), 1),
                "temperature": _or(config.get("temperature"), 0.7),
                "maxTokens": _or(config.get("maxTokens"), 1000),
            },
            "system_prompt": _convert_to_python_notation(system_key),
            "user_prompt": _convert_to_python_notation(user_key),
            "data": node_input,
            "memory_group": memory_group or None,
            "memory_group_name": memory_group_name,
            "tools": tools,
            "memory_type": memory_type,
            "memory_window_size": memory_window_size,
            "return_key": output_variable,
            "chat_id": self.record.get("chat_id"),
        }
        # 프론트(JSON.stringify)처럼 값이 없는 키는 보내지 않음
        payload = {k: v for k, v in payload.items() if v is not None}

        response = WorkflowService.process_agent_node(payload)
        if _is_error_output(response):
            return {"success": False, "output": {"error": response["error"], "details": response.get("details")}}
        return {"success": True, "output": {**node_input, output_variable: response}}

    def _run_condition_node(self, node: Dict, node_input: Dict[str, Any]) -> Dict[str, Any]:
        outgoing = self._outgoing(node["id"])

        def order_key(edge):
            order = (edge.get("data") or {}).get("conditionOrderIndex")
            return (order if isinstance(order, (int, float)) else float("inf"), edge.get("id"))

        sorted_edges = sorted(outgoing, key=order_key)
        start_node = next((n for n in self.node_list if n.get("type") == "startNode"), None)
        argument_name = (((start_node or {}).get("data") or {}).get("config") or {}).get("className") or "data"

        response = WorkflowService.process_condition_node({
            "input_data": node_input,
            "conditions": [{
                "edge_id": e["id"],
                "condition": (e.get("data") or {}).get("label") or "",
                "target_node_id": e.get("target"),
            } for e in sorted_edges],
            "argument_name": argument_name,
        })
        if not response.get("success"):
            return {"success": False, "output": {"error": response.get("error") or "Condition evaluation failed"}}

        matched_edge_id = None
        for edge in sorted_edges:
            result = next((r for r in response.get("evaluation_results", []) if r.get("edge_id") == edge["id"]), None)
            if result and result.get("is_matched"):
                matched_edge_id = edge["id"]
                break

        edge_outputs = {}
        for index, edge in enumerate(sorted_edges):
            is_last = index == len(sorted_edges) - 1
            if edge["id"] == matched_edge_id or (is_last and matched_edge_id is None):
                edge_outputs[edge["id"]] = node_input
            else:
                edge_outputs[edge["id"]] = None
        return {"success": True, "output": node_input, "edge_outputs": edge_outputs}

    def _run_merge_node(self, node: Dict, config: Dict, edge_outputs: Dict[str, Any]) -> Dict[str, Any]:
        incoming = self._incoming(node["id"])
        ready = [e for e in incoming if _has_valid_edge_data(edge_outputs.get(e["id"]))]
        if len(ready) != len(incoming):
            return {"success": False, "output": {
                "status": "waiting",
                "message": f"Edge 데이터 대기 중: {len(ready)}/{len(incoming)} ready",
                "waitingReason": "edge_data_insufficient",
            }}

        merged_data = {}
        for edge in ready:
            merged_data[self._label(edge["source"])] = edge_outputs[edge["id"]]

        mappings = []
        for mapping in config.get("mergeMappings") or []:
            source_id = mapping.get("sourceNodeId")
            mappings.append({
                "outputKey": mapping.get("outputKey"),
                "sourceNodeId": self._label(source_id) if source_id in self.nodes else source_id,
                "sourceNodeKey": mapping.get("sourceNodeKey"),
            })
        if not mappings:
            return {"success": False, "output": {"error": "No merge mappings configured"}}

        output = WorkflowService.process_merge_node({
            "nodeId": node["id"],
            "nodeType": "mergeNode",
            "config": {"mergeMappings": mappings},
            "data": merged_data,
        })
        if _is_error_output(output):
            return {"success": False, "output": {"error": output["error"], "details": output.get("details")}}
        return {"success": True, "output": output}

    # ------------------------------------------------------------------
    # 워크플로우 스케줄링 (프론트 runWorkflow 와 동일)
    # ------------------------------------------------------------------
    def _runnable_downstream(self, completed_id: str) -> List[str]:
        result = []
        with self.lock:
            for edge in self._outgoing(completed_id):
                output = self._edge_state(edge["id"])["output"]
                if output is None:
                    continue
                target_id = edge.get("target")
                target = self.nodes.get(target_id)
                if not target:
                    continue
                if target.get("type") == "mergeNode":
                    incoming = self._incoming(target_id)
                    if all(_has_valid_edge_data(self._edge_state(e["id"])["output"]) for e in incoming):
                        result.append(target_id)
                elif self._is_condition_convergence(target_id):
                    if any(_has_valid_edge_data(self._edge_state(e["id"])["output"]) for e in self._incoming(target_id)):
                        result.append(target_id)
                else:
                    result.append(target_id)
        return result

    def _initial_runnable(self, start_id: str) -> List[str]:
        """처음 실행할 노드 목록. 이어서 실행이면 재사용 노드의 하류 중 실행 가능한 노드부터 시작"""
        reused = [nid for nid, s in self.record["node_states"].items() if s.get("reused")]
        if not reused:
            return [start_id]
        runnable: List[str] = []
        for node_id in reused:
            for down_id in self._runnable_downstream(node_id):
                state = self._node_state(down_id)
                if not state.get("reused") and down_id not in runnable:
                    runnable.append(down_id)
        return runnable

    def _can_start(self, node_id: str, exec_count: Dict[str, int]) -> bool:
        return node_id in self.nodes and exec_count.get(node_id, 0) < MAX_NODE_EXECUTIONS

    def run(self):
        run_id = self.record["id"]
        logger.info(f"[WorkflowRun {run_id}] started ({self.record['workflow_name']})")
        with self.lock:
            self.record["status"] = "running"
            self.record["started_at"] = _now_iso()
            self._add_event("run_started")
            if self.record.get("resumed_from"):
                reused = sum(1 for s in self.record["node_states"].values() if s.get("reused"))
                self._add_event("run_resumed", message=f"{self.record['resumed_from'][:8]} 실행에서 이어서 실행 (성공 노드 {reused}개 재사용)")
            self._touch()

        error_nodes: List[str] = []
        pool = ThreadPoolExecutor(max_workers=MAX_PARALLEL_NODES, thread_name_prefix=f"run-{run_id[:8]}")
        running: Dict[Future, str] = {}
        try:
            start_node = next((n for n in self.node_list if n.get("type") == "startNode"), None)
            if not start_node:
                raise ValueError("워크플로우에 시작 노드가 없습니다.")

            exec_count: Dict[str, int] = {}
            merge_wait: Dict[str, int] = {}
            runnable: List[str] = self._initial_runnable(start_node["id"])
            iterations = 0

            while iterations <= MAX_TOTAL_ITERATIONS:
                if self.cancel_event.is_set():
                    raise RunCancelled()

                running_ids = set(running.values())
                for node_id in list(runnable):
                    if node_id in running_ids or not self._can_start(node_id, exec_count):
                        continue
                    runnable.remove(node_id)
                    exec_count[node_id] = exec_count.get(node_id, 0) + 1
                    running[pool.submit(self._execute_node, node_id)] = node_id
                    running_ids.add(node_id)

                if not running:
                    break

                done, _ = wait(list(running.keys()), timeout=0.5, return_when=FIRST_COMPLETED)
                for future in done:
                    iterations += 1
                    node_id = running.pop(future)
                    try:
                        output = future.result()
                    except RunCancelled:
                        raise
                    except Exception as e:
                        output = {"error": "Execution failed", "details": str(e)}
                    if _is_error_output(output):
                        error_nodes.append(self._label(node_id))

                    for down_id in self._runnable_downstream(node_id):
                        if down_id not in running.values() and down_id not in runnable:
                            runnable.append(down_id)

                    node = self.nodes.get(node_id) or {}
                    if node.get("type") == "mergeNode":
                        if isinstance(output, dict) and output.get("status") == "waiting":
                            merge_wait[node_id] = merge_wait.get(node_id, 0) + 1
                            if merge_wait[node_id] < MAX_MERGE_WAIT_ATTEMPTS and node_id not in runnable:
                                runnable.append(node_id)
                        else:
                            merge_wait[node_id] = 0
            else:
                logger.warning(f"[WorkflowRun {run_id}] max iterations reached")

            self._complete("failed" if error_nodes else "succeeded", error_nodes=error_nodes)
        except RunCancelled:
            self._complete("cancelled", error="사용자에 의해 실행이 중지되었습니다.", running_ids=list(running.values()))
        except Exception as e:
            logger.error(f"[WorkflowRun {run_id}] failed: {e}", exc_info=True)
            self._complete("failed", error=str(e), error_nodes=error_nodes,
                           running_ids=list(running.values()), details=traceback.format_exc())
        finally:
            # 진행 중인 LLM 호출 등은 끝까지 기다리지 않음 (결과는 버려짐)
            pool.shutdown(wait=False, cancel_futures=True)
            self.service._on_run_finished(run_id)

    def _complete(self, status: str, error: Optional[str] = None, error_nodes: Optional[List[str]] = None,
                  running_ids: Optional[List[str]] = None, details: Optional[str] = None):
        with self.lock:
            for node_id in running_ids or []:
                state = self._node_state(node_id)
                state["status"] = "cancelled" if status == "cancelled" else "failed"
                state["is_executing"] = False
                state["ended_at"] = _now_iso()
                for edge in self._outgoing(node_id):
                    if self._edge_state(edge["id"])["status"] == "executing":
                        self._set_edge_status(edge["id"], "idle")
            ended = datetime.utcnow()
            started = self.record.get("started_at") or self.record["created_at"]
            self.record["status"] = status
            self.record["ended_at"] = ended.isoformat() + "Z"
            self.record["duration_ms"] = int((ended - datetime.fromisoformat(started.rstrip("Z"))).total_seconds() * 1000)
            self.record["error"] = error
            self.record["error_details"] = details
            self.record["error_nodes"] = error_nodes or []
            end_node = next((n for n in self.node_list if n.get("type") == "endNode"), None)
            if end_node:
                self.record["final_output"] = self._node_state(end_node["id"]).get("output")
            self._add_event(f"run_{status}", message=error)
            self._touch()
        logger.info(f"[WorkflowRun {self.record['id']}] finished: {status}")


class WorkflowRunService:
    """워크플로우 서버 실행 관리 (시작/조회/목록/중지)"""

    def __init__(self, runs_dir: str = "workflow_runs"):
        self.runs_dir = runs_dir
        self.active: Dict[str, WorkflowRun] = {}
        self.lock = threading.Lock()
        os.makedirs(self.runs_dir, exist_ok=True)
        self._recover_interrupted_runs()

    # ------------------------------------------------------------------
    # 저장소
    # ------------------------------------------------------------------
    def _path(self, run_id: str) -> str:
        safe_id = os.path.basename(run_id)
        return os.path.join(self.runs_dir, f"{safe_id}.json")

    def _save(self, record: Dict[str, Any]):
        path = self._path(record["id"])
        tmp_path = f"{path}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, default=str)
            os.replace(tmp_path, path)
        except Exception as e:
            logger.error(f"Failed to save workflow run {record['id']}: {e}")

    def _load(self, run_id: str) -> Optional[Dict[str, Any]]:
        path = self._path(run_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load workflow run {run_id}: {e}")
            return None

    def _recover_interrupted_runs(self):
        """서버가 실행 도중 종료된 경우 남아있는 running 상태를 실패로 정리"""
        for filename in os.listdir(self.runs_dir):
            if not filename.endswith(".json"):
                continue
            record = self._load(filename[:-5])
            if record and record.get("status") not in TERMINAL_STATUSES:
                record["status"] = "failed"
                record["error"] = "서버가 재시작되어 실행이 중단되었습니다."
                record["ended_at"] = record.get("updated_at") or _now_iso()
                for state in record.get("node_states", {}).values():
                    if state.get("status") == "running":
                        state["status"] = "failed"
                        state["is_executing"] = False
                self._save(record)

    # ------------------------------------------------------------------
    # 공개 API
    # ------------------------------------------------------------------
    def start_run(self, workflow_name: str, nodes: List[Dict], edges: List[Dict], chat_id: Optional[str] = None,
                  resume_from: Optional[str] = None, triggered_by: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        prev = None
        reusable: Set[str] = set()
        if resume_from:
            prev = self.get_run(resume_from)
            if not prev:
                raise ValueError(f"이어서 실행할 실행 기록({resume_from})을 찾을 수 없습니다.")
            if prev.get("workflow_name") != workflow_name:
                raise ValueError("다른 워크플로우의 실행 기록에서는 이어서 실행할 수 없습니다.")
            if prev.get("status") not in ("failed", "cancelled"):
                raise ValueError("실패했거나 중지된 실행만 이어서 실행할 수 있습니다.")
            reusable = _find_reusable_nodes(nodes, edges, prev)
            chat_id = chat_id or prev.get("chat_id")

        with self.lock:
            for run in self.active.values():
                if run.record["workflow_name"] == workflow_name:
                    raise RuntimeError("이 워크플로우는 이미 실행 중입니다.")

            run_id = str(uuid.uuid4())
            record = {
                "id": run_id,
                "workflow_name": workflow_name,
                "status": "queued",
                "chat_id": chat_id,
                "created_at": _now_iso(),
                "started_at": None,
                "ended_at": None,
                "updated_at": _now_iso(),
                "duration_ms": None,
                "error": None,
                "error_details": None,
                "error_nodes": [],
                "final_output": None,
                "cancel_requested": False,
                "resumed_from": resume_from,
                # 실행 주체: None 이면 사용자가 Run 버튼으로 실행, {"type": "schedule", ...} 이면 스케줄 실행
                "triggered_by": triggered_by,
                "version": 0,
                "node_states": {
                    n["id"]: {
                        "label": (n.get("data") or {}).get("label") or n.get("type"),
                        "type": n.get("type"),
                        "status": "pending",
                        "is_executing": False,
                        "exec_count": 0,
                        "started_at": None,
                        "ended_at": None,
                        "duration_ms": None,
                        "input": None,
                        "output": None,
                        "error": None,
                    } for n in nodes
                },
                "edge_states": {e["id"]: {"output": PENDING, "timestamp": 0, "status": "idle"} for e in edges},
                "events": [],
                "snapshot": {"nodes": nodes, "edges": edges},
            }
            if prev:
                # 재사용 노드의 상태와 그 노드에서 나간 엣지 데이터를 이전 실행에서 복사
                for node_id in reusable:
                    record["node_states"][node_id] = {**copy.deepcopy(prev["node_states"][node_id]), "reused": True}
                for edge in edges:
                    prev_edge = (prev.get("edge_states") or {}).get(edge["id"])
                    if edge.get("source") in reusable and prev_edge:
                        record["edge_states"][edge["id"]] = copy.deepcopy(prev_edge)
            run = WorkflowRun(self, record, nodes, edges)
            self.active[run_id] = run
            self._save(record)

        thread = threading.Thread(target=run.run, name=f"workflow-run-{run_id[:8]}", daemon=True)
        thread.start()
        return self._summary(record)

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        run = self.active.get(run_id)
        if run:
            with run.lock:
                return copy.deepcopy(run.record)
        return self._load(run_id)

    def list_runs(self, workflow_name: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        summaries = []
        filenames = [f for f in os.listdir(self.runs_dir) if f.endswith(".json")]
        # 최근 수정된 파일부터 읽고 limit 개를 채우면 중단
        filenames.sort(key=lambda f: os.path.getmtime(os.path.join(self.runs_dir, f)), reverse=True)
        for filename in filenames:
            if len(summaries) >= limit:
                break
            run_id = filename[:-5]
            run = self.active.get(run_id)
            if run:
                with run.lock:
                    record = run.record
                    summary = self._summary(record)
            else:
                record = self._load(run_id)
                if not record:
                    continue
                summary = self._summary(record)
            if workflow_name and summary["workflow_name"] != workflow_name:
                continue
            if status and summary["status"] != status:
                continue
            summaries.append(summary)
        summaries.sort(key=lambda s: s["created_at"], reverse=True)
        return summaries

    def cancel_run(self, run_id: str) -> Dict[str, Any]:
        run = self.active.get(run_id)
        if not run:
            record = self._load(run_id)
            if not record:
                raise KeyError(run_id)
            return self._summary(record)
        with run.lock:
            run.record["cancel_requested"] = True
            run._add_event("cancel_requested")
            run._touch()
        run.cancel_event.set()
        return self._summary(run.record)

    def delete_run(self, run_id: str) -> bool:
        if run_id in self.active:
            raise RuntimeError("실행 중인 기록은 삭제할 수 없습니다. 먼저 중지하세요.")
        path = self._path(run_id)
        if not os.path.exists(path):
            return False
        os.remove(path)
        return True

    def _on_run_finished(self, run_id: str):
        with self.lock:
            self.active.pop(run_id, None)

    @staticmethod
    def _summary(record: Dict[str, Any]) -> Dict[str, Any]:
        node_states = record.get("node_states") or {}
        return {
            "id": record["id"],
            "workflow_name": record["workflow_name"],
            "status": record["status"],
            "created_at": record["created_at"],
            "started_at": record.get("started_at"),
            "ended_at": record.get("ended_at"),
            "duration_ms": record.get("duration_ms"),
            "error": record.get("error"),
            "error_nodes": record.get("error_nodes") or [],
            "cancel_requested": record.get("cancel_requested", False),
            "resumed_from": record.get("resumed_from"),
            "triggered_by": record.get("triggered_by"),
            "reused_node_count": sum(1 for s in node_states.values() if s.get("reused")),
            "node_count": len(node_states),
            "completed_node_count": sum(1 for s in node_states.values() if s.get("status") in ("succeeded", "failed")),
            "running_nodes": [s.get("label") for s in node_states.values() if s.get("status") == "running"],
        }


workflow_run_service = WorkflowRunService()

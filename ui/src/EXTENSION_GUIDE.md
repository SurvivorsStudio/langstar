# LangStar 확장 가이드

이 문서는 LangStar 플랫폼을 확장하는 방법을 설명합니다.

## 목차

1. [새로운 노드 타입 추가](#새로운-노드-타입-추가)
2. [새로운 스토어 추가](#새로운-스토어-추가)
3. [새로운 API 엔드포인트 추가](#새로운-api-엔드포인트-추가)
4. [커스텀 유틸리티 함수 추가](#커스텀-유틸리티-함수-추가)

---

## 새로운 노드 타입 추가

새로운 노드 타입을 추가하려면 다음 단계를 따르세요.

### 1단계: 타입 정의

`types/node.ts`에 노드 설정 인터페이스를 추가합니다:

```typescript
// types/node.ts

export interface MyCustomNodeConfig {
  // 노드별 설정 속성
  customProperty: string;
  optionalProperty?: number;
}

// NodeConfig 유니온 타입에 추가
export type NodeConfig = 
  | StartNodeConfig
  | PromptNodeConfig
  | AgentNodeConfig
  | FunctionNodeConfig
  | ConditionNodeConfig
  | MergeNodeConfig
  | LoopNodeConfig
  | EndNodeConfig
  | UserNodeConfig
  | MyCustomNodeConfig;  // 새로 추가
```

### 2단계: 노드 API 서비스 생성

`services/nodeApi/myCustomNodeApi.ts` 파일을 생성합니다:

```typescript
// services/nodeApi/myCustomNodeApi.ts

import { NodeData } from '../../types/node';
import { ApiResponse, handleApiError, makeApiRequest } from './types';

/**
 * Execute a custom node
 * @param nodeId - The ID of the node to execute
 * @param nodeData - The node's data including configuration
 * @param inputData - Input data from previous nodes
 * @param chatId - Optional chat session ID
 * @returns The execution result
 */
export async function executeMyCustomNode(
  nodeId: string,
  nodeData: NodeData,
  inputData: any,
  chatId?: string
): Promise<ApiResponse> {
  try {
    const payload = {
      node_id: nodeId,
      node_data: nodeData,
      input_data: inputData,
      chat_id: chatId,
    };

    return await makeApiRequest('/api/execute/my-custom-node', payload);
  } catch (error) {
    throw handleApiError(error, 'MyCustomNode');
  }
}
```

`services/nodeApi/index.ts`에 export 추가:

```typescript
// services/nodeApi/index.ts

export * from './myCustomNodeApi';
```

### 3단계: 노드 실행자 생성

`services/execution/nodeExecutors/myCustomNodeExecutor.ts` 파일을 생성합니다:

```typescript
// services/execution/nodeExecutors/myCustomNodeExecutor.ts

/**
 * MyCustomNode Executor
 * 
 * Handles execution of custom nodes with specific business logic.
 */

import { Node } from 'reactflow';
import { NodeData } from '../../../types/node';
import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeMyCustomNode } from '../../nodeApi/myCustomNodeApi';

export class MyCustomNodeExecutor implements NodeExecutor {
  /**
   * Execute a custom node
   * @param context - Execution context containing node, callbacks, and chatId
   * @returns Execution result with output data
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, callbacks, chatId } = context;
    const nodeData = node.data;

    try {
      // 1. 입력 데이터 준비
      const inputData = nodeData.inputData || {};

      // 2. API 호출
      const result = await executeMyCustomNode(
        node.id,
        nodeData,
        inputData,
        chatId
      );

      // 3. 결과 처리
      const output = result.output || result;

      // 4. 노드 데이터 업데이트
      callbacks.onNodeDataUpdate(node.id, {
        output: output,
        inputData: inputData,
      });

      return {
        success: true,
        output: output,
      };
    } catch (error) {
      console.error(`[MyCustomNodeExecutor] Error executing node ${node.id}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

### 4단계: 실행자 레지스트리에 등록

`services/execution/nodeExecutors/index.ts`에 등록합니다:

```typescript
// services/execution/nodeExecutors/index.ts

import { MyCustomNodeExecutor } from './myCustomNodeExecutor';

// 레지스트리에 등록
registerNodeExecutor('myCustomNode', new MyCustomNodeExecutor());

// Export
export { MyCustomNodeExecutor } from './myCustomNodeExecutor';
```

### 5단계: UI 컴포넌트 생성

`components/nodes/MyCustomNode.tsx` 파일을 생성합니다:

```typescript
// components/nodes/MyCustomNode.tsx

import React from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData } from '../../types/node';

interface MyCustomNodeProps {
  data: NodeData;
  id: string;
}

const MyCustomNode: React.FC<MyCustomNodeProps> = ({ data, id }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header">
        <span className="node-icon">🎯</span>
        <span className="node-label">{data.label}</span>
      </div>
      
      <div className="node-body">
        {/* 노드별 UI 컨텐츠 */}
        <p>{data.config?.customProperty}</p>
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default MyCustomNode;
```

### 6단계: 노드 타입 등록

`components/nodes/nodeTypes.tsx`에 노드 타입을 등록합니다:

```typescript
// components/nodes/nodeTypes.tsx

import MyCustomNode from './MyCustomNode';

export const nodeTypes = {
  startNode: StartNode,
  promptNode: PromptNode,
  agentNode: AgentNode,
  functionNode: FunctionNode,
  conditionNode: ConditionNode,
  mergeNode: MergeNode,
  loopNode: LoopNode,
  userNode: UserNode,
  endNode: EndNode,
  myCustomNode: MyCustomNode,  // 새로 추가
};
```

### 7단계: 노드 카테고리에 추가

`data/nodeCategories.tsx`에 노드를 추가합니다:

```typescript
// data/nodeCategories.tsx

export const nodeCategories = [
  {
    name: 'Custom Nodes',
    nodes: [
      {
        type: 'myCustomNode',
        label: 'My Custom Node',
        description: 'A custom node for specific functionality',
        icon: '🎯',
        defaultConfig: {
          customProperty: 'default value',
        },
      },
    ],
  },
  // ... 기존 카테고리들
];
```

### 8단계: flowStore에 기본 설정 추가

`store/flowStore.ts`의 `addNode` 함수에 기본 설정을 추가합니다:

```typescript
// store/flowStore.ts

addNode: ({ type, position, data }) => {
  const id = nanoid();
  const uniqueLabel = getUniqueNodeName(get().nodes, data.label);
  
  const defaultConfig = type === 'myCustomNode' ? {
    customProperty: 'default value',
    optionalProperty: 0,
  } : // ... 기존 조건들
  
  // ... 나머지 로직
}
```

---

## 새로운 스토어 추가

새로운 Zustand 스토어를 추가하려면 다음 단계를 따르세요.

### 1단계: 스토어 파일 생성

`store/myFeatureStore.ts` 파일을 생성합니다:

```typescript
// store/myFeatureStore.ts

/**
 * My Feature Store
 * 
 * Manages state for my specific feature.
 */

import { create } from 'zustand';
import * as storageService from '../services/storageService';

/**
 * My feature state interface
 */
export interface MyFeatureState {
  // State
  items: MyItem[];
  isLoading: boolean;
  loadError: string | null;

  // Functions
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<MyItem, 'id'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<MyItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

/**
 * My Feature Store
 * 
 * Provides state management for my feature using Zustand.
 */
export const useMyFeatureStore = create<MyFeatureState>((set, get) => ({
  // Initial state
  items: [],
  isLoading: false,
  loadError: null,

  /**
   * Fetch all items from the backend
   */
  fetchItems: async () => {
    try {
      set({ isLoading: true, loadError: null });
      
      const items = await storageService.getMyItems();
      set({ items, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * Add a new item
   * @param item - Item data without ID
   */
  addItem: async (item: Omit<MyItem, 'id'>) => {
    try {
      set({ isLoading: true, loadError: null });
      
      const newItem = await storageService.createMyItem(item);
      set(state => ({
        items: [...state.items, newItem],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * Update an existing item
   * @param id - Item ID
   * @param updates - Partial item updates
   */
  updateItem: async (id: string, updates: Partial<MyItem>) => {
    try {
      set({ isLoading: true, loadError: null });
      
      const updatedItem = await storageService.updateMyItem(id, updates);
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? updatedItem : item
        ),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * Delete an item
   * @param id - Item ID
   */
  deleteItem: async (id: string) => {
    try {
      set({ isLoading: true, loadError: null });
      
      await storageService.deleteMyItem(id);
      set(state => ({
        items: state.items.filter(item => item.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage, isLoading: false });
      throw error;
    }
  },
}));
```

### 2단계: 타입 정의

`types/myFeature.ts` 파일을 생성합니다:

```typescript
// types/myFeature.ts

export interface MyItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyItemForm {
  name: string;
  description: string;
}
```

### 3단계: 컴포넌트에서 사용

```typescript
// components/MyFeatureComponent.tsx

import React, { useEffect } from 'react';
import { useMyFeatureStore } from '../store/myFeatureStore';

const MyFeatureComponent: React.FC = () => {
  const { 
    items, 
    isLoading, 
    loadError,
    fetchItems, 
    addItem, 
    deleteItem 
  } = useMyFeatureStore();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    try {
      await addItem({
        name: 'New Item',
        description: 'Description',
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (loadError) return <div>Error: {loadError}</div>;

  return (
    <div>
      <button onClick={handleAdd}>Add Item</button>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name}
            <button onClick={() => deleteItem(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyFeatureComponent;
```

---

## 새로운 API 엔드포인트 추가

### Frontend (apiService.ts)

`services/apiService.ts`에 새로운 API 함수를 추가합니다:

```typescript
// services/apiService.ts

export const apiService = {
  // ... 기존 함수들

  /**
   * Get my items from the backend
   */
  async getMyItems(): Promise<MyItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/my-items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch items: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Create a new item
   */
  async createMyItem(item: Omit<MyItem, 'id'>): Promise<MyItem> {
    const response = await fetch(`${API_BASE_URL}/api/my-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`Failed to create item: ${response.statusText}`);
    }

    return response.json();
  },
};
```

### Backend (FastAPI)

서버 측에 새로운 라우트를 추가합니다:

```python
# server/routes/my_feature.py

from fastapi import APIRouter, HTTPException
from typing import List
from models.my_feature import MyItem, MyItemCreate
from services.my_feature_service import MyFeatureService

router = APIRouter(prefix="/api/my-items", tags=["my-feature"])
service = MyFeatureService()

@router.get("/", response_model=List[MyItem])
async def get_items():
    """Get all items"""
    try:
        return await service.get_all_items()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=MyItem)
async def create_item(item: MyItemCreate):
    """Create a new item"""
    try:
        return await service.create_item(item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_item(item_id: str):
    """Delete an item"""
    try:
        await service.delete_item(item_id)
        return {"message": "Item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

`server/app.py`에 라우터를 등록합니다:

```python
# server/app.py

from routes import my_feature

app.include_router(my_feature.router)
```

---

## 커스텀 유틸리티 함수 추가

### 1단계: 유틸리티 파일 생성

`utils/myUtils.ts` 파일을 생성합니다:

```typescript
// utils/myUtils.ts

/**
 * My Utility Functions
 * 
 * Collection of utility functions for my feature.
 */

/**
 * Format a date string
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Debounce a function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
```

### 2단계: 사용 예제

```typescript
// components/MyComponent.tsx

import { formatDate, isValidEmail, debounce } from '../utils/myUtils';

const MyComponent = () => {
  const formattedDate = formatDate('2024-12-10T10:00:00Z');
  
  const handleSearch = debounce((query: string) => {
    console.log('Searching for:', query);
  }, 300);

  const handleEmailChange = (email: string) => {
    if (isValidEmail(email)) {
      console.log('Valid email');
    }
  };

  // ...
};
```

---

## 베스트 프랙티스

### 1. 타입 안정성
- 모든 함수와 컴포넌트에 TypeScript 타입을 명시합니다
- `any` 타입 사용을 최소화합니다
- 인터페이스와 타입을 별도 파일로 분리합니다

### 2. 에러 처리
- 모든 비동기 함수에 try-catch 블록을 사용합니다
- 사용자에게 명확한 에러 메시지를 제공합니다
- 에러를 콘솔에 로깅합니다

### 3. 문서화
- 모든 함수에 JSDoc 주석을 추가합니다
- 복잡한 로직에는 인라인 주석을 추가합니다
- README 파일을 업데이트합니다

### 4. 테스트
- 새로운 기능에 대한 단위 테스트를 작성합니다
- 통합 테스트를 고려합니다
- 엣지 케이스를 테스트합니다

### 5. 성능
- 불필요한 리렌더링을 방지합니다 (useMemo, useCallback)
- 큰 리스트는 가상화를 고려합니다
- API 호출을 최적화합니다 (debounce, throttle)

---

## 참고 자료

- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Zustand 공식 문서](https://github.com/pmndrs/zustand)
- [ReactFlow 공식 문서](https://reactflow.dev/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)

---

## 도움이 필요하신가요?

질문이나 문제가 있으시면:
1. 기존 코드를 참고하세요
2. `store/README.md`를 확인하세요
3. 팀에 문의하세요

Happy coding! 🚀

# Contexts

This directory contains React Context providers for managing global application state and functionality.

## Available Contexts

### CollaborationContext
Provides real-time collaboration functionality using WebSocket connections.

**Features:**
- Real-time workflow synchronization
- User presence tracking
- Collaborative editing with conflict resolution
- WebSocket connection management

**Usage:**
```tsx
import { CollaborationProvider, useCollaborationContext } from './contexts/CollaborationContext';

// Wrap your app
<CollaborationProvider>
  <App />
</CollaborationProvider>

// Use in components
const { isConnected, activeUsers, sendUpdate } = useCollaborationContext();
```

## Adding New Contexts

When creating a new context:

1. Create a new file: `[ContextName]Context.tsx`
2. Define the context interface
3. Create the provider component
4. Export both the provider and a custom hook
5. Document it in this README

## Best Practices

- Keep contexts focused on a single responsibility
- Use TypeScript for type safety
- Provide meaningful default values
- Document all exported functions and properties
- Consider performance implications of context updates

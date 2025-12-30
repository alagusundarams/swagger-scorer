# Cross-Feature Communication - Context-First Architecture

## TL;DR

**For 99% of cases, use AppDataContext:**
```typescript
import { useAppData } from '@/shared/context/AppDataContext';

function MyComponent() {
  const { teams, environments } = useAppData();
  // Use teams/environments directly - read-only access
}
```

**Event bus is ONLY for refresh notifications:**
```typescript
// After mutating data via your feature's API
await myApi.createTeam(teamData);
eventBus.emit('team:created', { team: newTeam });  // Tells AppDataContext to refresh
```

---

## Architecture Overview

### Primary: Shared Context (AppDataContext)

**Use For:** Read-only access to commonly-needed data (teams, environments)

**Benefits:**
- ✅ Simple React pattern everyone knows
- ✅ Automatic re-renders when data changes
- ✅ Type-safe with TypeScript
- ✅ No memory leak concerns (React handles it)

**How It Works:**
1. Root app wraps everything in `<AppDataProvider>`
2. Provider fetches teams/environments once at startup
3. Any component can read via `useAppData()` hook
4. When mutations happen, emit an event to trigger refresh

### Secondary: Event Bus (Lightweight)

**Use For:** Telling AppDataContext "data changed, please refresh"

**Benefits:**
- ✅ Decouples features (emitter doesn't know about listeners)
- ✅ Simple pub/sub pattern
- ✅ Type-safe events

**When To Use:**
- After creating/updating/deleting teams
- After creating/updating products
- Rarely needed - most features just READ data

---

## Usage Patterns

### Pattern 1: Reading Shared Data (Most Common)

```typescript
import { useAppData } from '@/shared/context/AppDataContext';

function TeamSelector() {
  const { teams, isLoading } = useAppData();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <select>
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
```

### Pattern 2: Mutating Data and Notifying

```typescript
import { teamsApi } from '../api/teamsClient';
import { eventBus } from '@/shared/events/eventBus';

async function createTeam(teamData) {
  // 1. Mutate via your feature's API
  const newTeam = await teamsApi.createTeam(teamData);
  
  // 2. Emit event to refresh shared context
  eventBus.emit('team:created', { team: newTeam });
  
  // 3. AppDataContext auto-refreshes, all components get new data
  return newTeam;
}
```

### Pattern 3: Manual Refresh (Rare)

```typescript
import { useAppData } from '@/shared/context/AppDataContext';

function AdminPanel() {
  const { refresh } = useAppData();
  
  return (
    <button onClick={() => refresh()}>
      Force Refresh All Data
    </button>
  );
}
```

---

## Event Catalog (Simplified)

### Team Events

#### `team:created`
**Payload:** `{ team: Team }`  
**When:** After successfully creating a new team  
**Subscribers:** AppDataContext (auto-refreshes teams)

#### `team:updated`
**Payload:** `{ teamId: string, team: Team }`  
**When:** After successfully updating team details  
**Subscribers:** AppDataContext (auto-refreshes teams)

#### `team:deleted`
**Payload:** `{ teamId: string }`  
**When:** After successfully deleting a team  
**Subscribers:** AppDataContext (auto-refreshes teams)

### Product Events

#### `product:created`
**Payload:** `{ product: Product }`  
**When:** After successfully creating a product  
**Subscribers:** AppDataContext (may refresh if needed)

#### `product:updated`
**Payload:** `{ productId: string, product: Product }`  
**When:** After successfully updating a product  
**Subscribers:** AppDataContext (may refresh if needed)

### Generic Refresh Event

#### `data:refresh`
**Payload:** `{ dataType: 'teams' | 'products' | 'all' }`  
**When:** When you need to force a refresh  
**Subscribers:** AppDataContext (refreshes specified data)

---

## Migration Guide

### Before (❌ Violates MFE)

```typescript
import { useTeamsStore } from '../../teams/store/teamsStore';

function MyComponent() {
  const { teams } = useTeamsStore();  // ❌ Cross-feature dependency
  // ...
}
```

### After (✅ MFE-Compliant)

```typescript
import { useAppData } from '../../../shared/context/AppDataContext';

function MyComponent() {
  const { teams } = useAppData();  // ✅ Shared context
  // ...
}
```

---

## Best Practices

### ✅ DO

- **Use AppDataContext for all read-only shared data**
- **Emit events after successful mutations** (create/update/delete via your API)
- **Keep event payloads simple** (just the ID and updated entity)
- **Document what events your feature emits** (in your feature's README)

### ❌ DON'T

- **Don't mutate data from AppDataContext** (it's read-only)
- **Don't create complex event chains** (A emits → B listens → B emits → C listens)
- **Don't use events for everything** (context is simpler for reads)
- **Don't import other features' stores** (use context or your own API)

---

## Testing

### Testing Components That Use Context

```typescript
import { render } from '@testing-library/react';
import { AppDataProvider } from '@/shared/context/AppDataContext';

test('component shows teams', () => {
  const mockTeams = [{ id: '1', name: 'Team A' }];
  
  render(
    <AppDataProvider teamsApi={{ getTeams: () => Promise.resolve(mockTeams) }}>
      <MyComponent />
    </AppDataProvider>
  );
  
  // Assert component renders teams
});
```

### Testing Event Emissions

```typescript
import { event Bus } from '@/shared/events/eventBus';

test('creates team and emits event', async () => {
  const mockHandler = jest.fn();
  eventBus.on('team:created', mockHandler);
  
  await createTeam({ name: 'New Team' });
  
  expect(mockHandler).toHaveBeenCalledWith({
    team: expect.objectContaining({ name: 'New Team' })
  });
});
```

---

## Architecture Decision

**Why Context-First?**

1. **Simpler**: Standard React pattern, no new concepts to learn
2. **Less Code**: No need for complex event handlers in every component
3. **Better DX**: Auto-complete, type safety, familiar patterns
4. **Performant**: React optimizes re-renders automatically
5. **Debuggable**: React DevTools shows context values

**Why Keep Event Bus?**

1. **Decoupling**: Features don't need to know about AppDataContext internals
2. **Flexibility**: Easy to add more listeners in the future
3. **Testing**: Easy to mock and verify emissions
4. **Optional**: If you don't emit events, context still works (just won't auto-refresh)

---

## Summary

```typescript
// PRIMARY PATTERN: Read shared data
const { teams } = useAppData();

// SECONDARY PATTERN: Notify after mutations
await myApi.updateTeam(teamId, updates);
eventBus.emit('team:updated', { teamId, team: updatedTeam });

// That's it! Simple and clean.
```

For more details, see [AppDataContext documentation](../context/AppDataContext.tsx).

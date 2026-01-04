# Frontend Developer Guide: Architecture & Scaling

## 1. Visual Architecture Overview
The frontend is designed as a **Federated Host** application. It is not just a collection of pages, but a composition of autonomous feature modules.

```mermaid
graph TD
    classDef scope fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef store fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    subgraph User["User Interaction"]
        Click["Click 'Edit Policy'"]
    end

    subgraph Feature["Feature: Policy Studio"]
        View["Smart Container (PolicyStudio.tsx)"]:::scope
        Hook["usePolicyStudio Hook"]:::scope
        UI["Dumb UI (PolicyCanvas.tsx)"]:::scope
    end

    subgraph State["Global State (Zustand)"]
        Slice["PolicySlice"]:::store
        Action["updateXml()"]:::store
    end

    subgraph Ext["External System"]
        API["Backend API"]
    end

    Click --> UI
    UI -- "onEdit(xml)" --> View
    View --> Hook
    Hook --> Action
    Action -- "State Update" --> Slice
    Slice -- "Re-render" --> View
    
    Hook -- "Async Fetch" --> API
```

---

## 2. Policy Studio: State Machine Diagram
The Policy Studio is a complex engine that transitions between "Visual" and "Code" states. Ensuring these states never drift is critical.

```mermaid
stateDiagram-v2
    [*] --> Loading
    
    Loading --> VisualMode : XML Parsed Successfully
    Loading --> CodeMode : XML Parsing Failed (Fallback)

    state VisualMode {
        [*] --> Idle
        Idle --> Dragging : User Starts Drag
        Dragging --> Dropped : Item Placed
        Dropped --> Regenerating : Trigger XML Gen
        Regenerating --> Idle : State Updated
    }

    state CodeMode {
        [*] --> Typing
        Typing --> Parsing : On Blur / Debounce
        Parsing --> Valid : Structure OK
        Parsing --> Invalid : Syntax Error
        Invalid --> Typing : User Fixes
    }

    VisualMode --> CodeMode : User clicks "View Code"
    CodeMode --> VisualMode : User clicks "Visual Editor" (If Valid)
```

---

## 3. Data Flow Sequence: The "Hook Pattern"
We strictly enforce a unidirectional data flow. Components never talk to APIs directly.

```mermaid
sequenceDiagram
    participant UI as Component
    participant Hook as useInventory()
    participant Store as Zustand Store
    participant Client as Axios Client
    participant API as Backend Service

    UI->>Hook: loadInventory()
    activate Hook
    Hook->>Store: setIsLoading(true)
    
    Hook->>Client: getProducts()
    activate Client
    Client->>API: GET /v1/products
    API-->>Client: 200 OK [JSON]
    deactivate Client
    
    Client-->>Hook: Data
    Hook->>Store: setProducts(data)
    Hook->>Store: setIsLoading(false)
    deactivate Hook
    
    Store-->>UI: Re-render with Data
```

---

## 4. Scaling The Frontend
How do we go from 5 developers to 50?

### Strategy 1: Federation (Module Splitting)
Currently, modules are imported statically. To scale, we can convert `src/features/*` into **Webpack Module Federation** remotes.
*   **Team A** owns `git/inventory-mfe` -> Deploys `inventory.js`.
*   **Team B** owns `git/policy-mfe` -> Deploys `policy.js`.
*   **App Host** consumes them at runtime.

### Strategy 2: State Isolation
We intentionally avoided a single `RootState` type exported from `store/index.ts` to prevent circular dependencies.
*   **Rule:** Feature A cannot import Feature B's slice directly.
*   **Communication:** Uses the `Global Event Bus` (or lightweight UI slice) for cross-feature signaling (e.g., "Toast Notification").

### Strategy 3: Component Library (Design System)
To maintain consistency at scale, `src/shared/ui` should be extracted to a private NPM package (`@company/ui-kit`).
*   **Before:** Import local button.
*   **After:** `import { Button } from '@company/ui-kit'`.
*   **Benefit:** Versioned breaking changes for UI.

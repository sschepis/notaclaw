# Implementation Spec: Service Layer

## 1. Overview
This specification details the implementation of the Network Services layer, enabling nodes to expose, discover, and consume monetizable services over the AlephNet mesh.

## 2. Core Components

### 2.1 Service Registry (`client/src/main/services/ServiceRegistry.ts`)
Manages the discovery of services on the mesh.

*   **Data Source**: Uses `AlephGunBridge` to query the `services/` graph path.
*   **Indexing**: Maintains a local index of available services for fast lookup.
*   **Methods**:
    *   `register(service: ServiceDefinition)`: Publishes a service to the mesh.
    *   `search(query: ServiceQuery)`: Finds matching services.
    *   `getHealth(serviceId: string)`: Aggregates health stats from instances.

### 2.2 Service Client (`client/src/main/services/ServiceClient.ts`)
Handles the consumption of remote services.

*   **Responsibilities**:
    *   Resolving the best provider node (latency, cost, reputation).
    *   Handling payments (Wallet integration).
    *   Making the actual request (HTTP proxy or Gun relay).
    *   Verifying results (SMF signature check).

### 2.3 Service Host (`client/src/main/services/ServiceHost.ts`)
Manages the local execution of services provided by this node.

*   **Responsibilities**:
    *   Listening for incoming requests.
    *   Validating permissions and payments.
    *   Routing requests to the appropriate plugin or internal handler.
    *   Reporting metrics to the mesh.

## 3. Data Structures

The `ServiceDefinition`, `ServiceInstance`, and `ServiceSubscription` interfaces (from Design 09) will be added to `client/src/shared/service-types.ts`.

## 4. Implementation Plan

1.  **Create `service-types.ts`**: Copy definitions from Design 09.
2.  **Implement `ServiceRegistry`**:
    *   Needs `AlephGunBridge` dependency.
    *   Implement `register` (put to Gun).
    *   Implement `search` (map/filter over Gun data).
3.  **Implement `ServiceClient`**:
    *   Needs `Wallet` and `AlephGunBridge`.
    *   Implement `call(serviceId, endpoint, params)`.
    *   Mock the payment layer for now (until Wallet is fully implemented).
4.  **Integration**:
    *   Expose `ServiceRegistry` and `ServiceClient` to the Renderer via `electronAPI`.

# Specter Client (specter-client)

Frontend dashboard and management console for Specter, connecting to `fa-server` and the Specter edge vision engine.

## Overview & Architecture

- **Stack**: React 19, TypeScript, Vite, TanStack Query v5, React Router v7, Tailwind CSS, Radix UI primitives.
- **Key Capabilities**:
  - **Live Video & Players**: Low-latency video playback using Media Source Extensions (MSE) over authenticated single-use WebSocket tickets, with graceful degradation to authenticated JPEG snapshots.
  - **Realtime**: Live updates for camera status and vision alerts via Socket.IO client.
  - **Vision Management**: Full UI for Specter entities including camera management (with watchlist assignments), watchlists/targets (photo uploads, enrollment tracking), and alerts (filtering, cursored pagination, acknowledge/resolve workflow).
  - **User & Access Management**: Role-based access (admin, manager, viewer) with camera assignment controls.

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested with Node 18/20/22)
- npm 10+
- Running `fa-server` instance

### Installation & Run

```bash
cd client
npm install

# Start development server with HMR (runs on http://localhost:5173 by default)
npm run dev

# Run unit and component tests
npm run test

# Type-check and build for production
npm run build
```

---

## Configuration

Client environment variables can be configured in `.env` or `.env.production`:

```env
# URL for the backend fa-server API
VITE_API_BASE_URL=http://localhost:12113
```

The variable is required because the client and server are deployed independently.

---

## Project Structure

```text
client/
├── src/
│   ├── app/           # Application layout, routes, navigation
│   ├── components/    # Reusable UI primitives (dialog, button, table, input)
│   ├── features/      # Feature-specific modules
│   │   ├── alerts/       # Alerts table, filter dialogs, resolution workflow
│   │   ├── cameras/      # Camera listing, create/edit modals, status cards
│   │   ├── dashboard/    # Metrics and activity summary widgets
│   │   ├── live/         # MSE session player, ticket negotiation, JPEG fallback
│   │   ├── realtime/     # Socket.IO connection and query cache invalidators
│   │   └── watchlists/   # Watchlists, target cards, multi-photo uploader
│   ├── pages/         # Top-level page components
│   ├── services/      # Typed API client services
│   └── lib/           # Utility helpers
```

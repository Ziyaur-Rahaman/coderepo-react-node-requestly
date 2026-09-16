<h1 align="center">Requestly</h1>

<p align="center">
  A full-stack, Postman-inspired API development and testing platform for creating, organizing, sending, and analyzing HTTP requests.
</p>

---

## 1. Product Overview

**Requestly** is a developer-focused API testing and workspace platform built with React, Express, and MongoDB. Designed for speed, clarity, and reliability, Requestly enables engineering teams and developers to build, send, inspect, and organize HTTP requests within isolated, customizable workspaces.

---

## 2. Main Features

- **API Request Builder**: Complete HTTP request constructor supporting standard HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`), dynamic query parameters, custom headers, and multiple body formats (None, JSON, Form-URL-Encoded, Raw Text). Includes a server-side HTTP proxy to bypass browser CORS restrictions and capture accurate network timings.
- **Collections & Folders**: Organize requests hierarchically into collections and nested folders. Supports inline renaming, reordering, request duplication, moving between folders, and deletion.
- **Request History**: Automatic, real-time logging of executed requests capturing HTTP method, target URL, response status code, roundtrip duration in milliseconds, response size, and timestamp. Allows one-click reloading of previous executions directly into the request builder, as well as one-click history clearing.
- **User Authentication**: Secure user registration and session management powered by JSON Web Tokens (JWT) and bcrypt password hashing (12 salt rounds), featuring persistent sessions and profile state restoration.
- **Environment Management**: Create and manage multiple target environments (e.g., Development, Production). Supports variable replacement using double curly-brace syntax (`{{variableName}}`) across URLs, headers, query parameters, and request body payloads.
- **Authentication Support**: Granular authentication configuration at both request and workspace scopes, including No Auth, Bearer Token, and Basic Auth (username & password) with automatic header injection.
- **HTTP Response Analysis**: Deep response inspection providing status code indicators, roundtrip execution latency in milliseconds, payload byte size, formatted JSON syntax highlighting, raw text preview, and a comprehensive response headers inspector.
- **Code Snippet Generation**: Instant export of configured HTTP requests to production-ready code snippets across multiple languages and libraries, including cURL, JavaScript `fetch`, Node.js native `http`, Python `requests`, and Axios.
- **cURL Import**: Direct import utility that parses raw cURL command strings, automatically populating the HTTP method, destination URL, headers, and request body into the editor.
- **Multi-Workspace Support**: First-class workspace management allowing users to create, rename, switch, and delete private workspaces (e.g., Personal, Company, Testing), with full resource isolation for each workspace.
- **Light / Dark Theme**: Modern UI theme switcher providing instant toggling between a sleek dark theme and an accessible, high-contrast light theme with unified design tokens.

---

## 3. Architecture

Requestly follows a layered, decoupled architecture with strict separation of concerns across the stack:

```text
React Frontend (Vite Single Page Application on Port 3000)
     │
     ▼ HTTP REST / JSON (JWT & Active Workspace Context Headers)
Express Backend (API Router on Port 8000)
     │
     ▼ Controller Layer & Request Validation (Zod Schemas)
Service Layer (Business Logic & Server-Side HTTP Proxy)
     │
     ▼ Repository / Data-Access Layer (Mongoose ODM)
MongoDB (Document Storage on Port 27017)
```

- **Frontend**: Single-page application built with React and Vite, featuring modular feature views (`requests`, `collections`, `environments`, `history`, `workspaces`, `auth`) and a centralized API service client.
- **Express Backend**: RESTful API server handling authentication, routing, and centralized error handling with structured JSON error responses.
- **Service Layer**: Encapsulates business logic, data validation, and outbound HTTP execution proxying with nanosecond timing measurement.
- **Data-Access Layer**: Mongoose models managing schemas, indexes, and document persistence in MongoDB.

---

## 4. Workspace Model

Requestly enforces a multi-workspace tenant model designed for privacy and resource scoping:

- **Single User Identity**: A user registers or logs in with a single account credential.
- **Multiple Workspaces**: A user can create, update, and manage multiple private workspaces (such as Personal, Company, Testing, or custom domains).
- **Workspace Scoping**: Collections, folders, saved requests, environments, and execution histories are strictly scoped to the active workspace. Switching the active workspace instantly updates the UI and scopes all subsequent operations to that workspace.

---

## 5. Technology Stack

- **Frontend**:
  - [React 19](https://react.dev/) (`react` 19.2.4, `react-dom` 19.2.4)
  - [Vite 8](https://vite.dev/) (`vite` 8.2.2, `@vitejs/plugin-react` 6.1.1)
  - [Roboto Typography](https://fontsource.org/fonts/roboto) (`@fontsource/roboto` 5.3.0)
  - Vanilla CSS with CSS Custom Properties (design tokens, glassmorphism, responsive grid)
- **Backend**:
  - [Bun](https://bun.sh/) JavaScript runtime and package manager
  - [Express 5](https://expressjs.com/) (`express` 5.2.1)
  - [MongoDB 8.0+](https://www.mongodb.com/) document database
  - [Mongoose 8](https://mongoosejs.com/) (`mongoose` 8.24.1)
  - [Zod 4](https://zod.dev/) (`zod` 4.3.6) for schema validation
  - [JSON Web Tokens](https://jwt.io/) (`jsonwebtoken` 9.0.2)
  - [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (`bcryptjs` 3.0.2)
  - [CORS](https://github.com/expressjs/cors) (`cors` 2.8.6)
  - [dotenv](https://github.com/motdotla/dotenv) (`dotenv` 17.3.1)
- **Tooling & Monorepo**:
  - [Concurrently](https://github.com/open-cli-tools/concurrently) (`concurrently` 9.2.1)

---

## 6. Repository Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/            # User registration, login, and JWT session handling
│   │   │   ├── collections/     # Collection and folder CRUD models, routes, and services
│   │   │   ├── environments/    # Environment variable management and interpolation
│   │   │   ├── history/         # Request execution history logging and querying
│   │   │   ├── people/          # Profile context resolution and team memberships
│   │   │   ├── requests/        # Request builder CRUD, duplication, and proxy execution
│   │   │   └── workspaces/      # Workspace isolation, listing, and lifecycle management
│   │   ├── scripts/
│   │   │   └── seed.js          # Deterministic MongoDB seed and reset script
│   │   ├── shared/
│   │   │   ├── config/          # Environment configuration loaders
│   │   │   ├── errors/          # Centralized AppError and status mapping
│   │   │   └── middleware/      # Auth verification, workspace scoping, and error handling
│   │   ├── app.js               # Express application initialization and middleware
│   │   └── index.js             # Server listener entrypoint
│   ├── .env.example             # Backend environment template
│   └── package.json             # Backend dependencies and scripts
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/            # Authentication forms, state, and session client
│   │   │   ├── collections/     # Collection tree view, folder modals, and management
│   │   │   ├── environments/    # Environment selector, variable editor, and active badges
│   │   │   ├── history/         # History sidebar list, entry detail, and clear actions
│   │   │   ├── profiles/        # User profile menu, avatar rendering, and theme toggling
│   │   │   ├── requests/        # HTTP builder, response viewer, cURL import, snippet export
│   │   │   └── workspaces/      # Workspace dropdown selector and creation modal
│   │   ├── shared/              # Reusable icon renderer, modal dialogs, and API client
│   │   ├── App.jsx              # Main dashboard layout, active tab routing, and theme provider
│   │   ├── index.html           # HTML5 entrypoint with responsive viewport
│   │   └── styles.css           # Global design system, theme variables, and component styles
│   ├── .env.example             # Frontend environment template
│   ├── package.json             # Frontend dependencies and scripts
│   └── vite.config.js           # Vite development server and build configuration
├── transcripts/                 # Authoritative AI pair-programming session transcripts
├── hackerrank.yml               # HackerRank evaluation environment configuration
├── setup.sh                     # Environment bootstrap, MongoDB validation, and seed script
└── package.json                 # Root monorepo workspace configuration
```

---

## 7. Prerequisites

Before setting up the application, verify that the following prerequisites are installed on your system:

- **Bun**: `v1.3.0` or later (tested on Bun `1.4.2`)
- **MongoDB**: `v8.0` or later running on `127.0.0.1:27017`

---

## 8. Setup

Requestly uses a clean-checkout setup command that installs monorepo dependencies and restores the deterministic MongoDB baseline:

```bash
bun install && bash setup.sh --seed
```

This script:
1. Generates local `.env` configuration files from `.env.example` templates if missing.
2. Checks MongoDB reachability on `127.0.0.1:27017`.
3. Seeds MongoDB with a clean, deterministic dataset.

---

## 9. Running the Application

To start both the frontend and backend services concurrently:

```bash
bun start
```

This executes `setup.sh --start` to verify database connectivity, restores the seed baseline, and starts both the Express API and the Vite development server.

---

## 10. Ports

| Service | Port | Local URL |
|---|---|---|
| Frontend | `3000` | [http://localhost:3000](http://localhost:3000) |
| Backend API | `8000` | [http://localhost:8000](http://localhost:8000) |
| MongoDB | `27017` | `mongodb://127.0.0.1:27017/postman_db` |

API health status can be checked directly at [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health).

---

## 11. Environment Configuration

The application reads all configuration from environment variables. Example configuration templates are tracked in the repository.

### Backend (`backend/.env.example`)

```dotenv
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/postman_db
JWT_SECRET=postman-secret-jwt-key-2026
JWT_EXPIRES_IN=24h
```

### Frontend (`frontend/.env.example`)

```dotenv
VITE_API_URL=/api/v1
```

> **Security Note**: Never commit live production secrets, private encryption keys, or sensitive credentials to source control.

---

## 12. Seed & Demo Data

The database can be reset to its deterministic baseline at any time with:

```bash
bun run seed
```

### Pre-Configured Demo Credentials

| Role | Email | Password | Default Workspaces |
|---|---|---|---|
| Primary Demo User | `alex.morgan@postman.com` | `password123` | Personal, Company, Testing |
| Secondary User | `jordan.smith@postman.com` | `password123` | Personal, Company, Testing |
| Analyst User | `taylor.johnson@postman.com` | `password123` | Personal, Company, Testing |

### Seeded Assets in Default Workspace

- **Collections**: `JSONPlaceholder API`, `System & Monitoring`
- **Folders**: `Posts`, `Users`
- **Sample Requests**:
  - `Get System Health` (`GET http://localhost:8000/api/v1/health`)
  - `Get Users (JSONPlaceholder)` (`GET https://jsonplaceholder.typicode.com/users?limit=5`)
  - `Create Post (JSONPlaceholder)` (`POST https://jsonplaceholder.typicode.com/posts`)
  - `Zen Quote (GitHub API)` (`GET https://api.github.com/zen`)
- **Environments**:
  - `Development`: `baseUrl = http://localhost:8000`, `apiKey = dev-postman-sec-key-7788`
  - `Production`: `baseUrl = https://jsonplaceholder.typicode.com`, `apiKey = prod-live-api-token-9900`

---

## 13. API Overview

All backend endpoints are scoped under `/api/v1`:

### Authentication (`/api/v1/auth`)
- `POST /register`: Create a new user account and default workspaces.
- `POST /login`: Authenticate email and password, returning a JWT token and user profile.
- `GET /session`: Validate active JWT session and return authenticated account context.
- `POST /switch-profile`: Switch active profile/workspace context within the current session.
- `POST /logout`: Invalidate client session.

### Workspaces (`/api/v1/workspaces`)
- `GET /`: List all workspaces belonging to the authenticated account.
- `POST /`: Create a new private workspace.
- `GET /:workspaceId`: Retrieve workspace details.
- `PATCH /:workspaceId`: Update workspace name or description.
- `DELETE /:workspaceId`: Delete a custom workspace (default Personal workspace is protected).

### Collections & Folders (`/api/v1/collections`)
- `GET /`: List all collections for the active workspace.
- `GET /tree`: Retrieve nested tree structure of collections and folders.
- `POST /`: Create a new collection.
- `GET /:collectionId`: Get collection details.
- `PATCH /:collectionId`: Update collection metadata.
- `DELETE /:collectionId`: Remove collection and nested items.
- `POST /:collectionId/duplicate`: Duplicate collection with all folders and requests.
- `GET /:collectionId/folders`: List folders inside a collection.
- `POST /:collectionId/folders`: Create a nested folder.
- `PATCH /:collectionId/folders/:folderId`: Update folder metadata.
- `DELETE /:collectionId/folders/:folderId`: Delete folder.
- `POST /:collectionId/folders/:folderId/duplicate`: Duplicate folder and its requests.

### Requests (`/api/v1/requests`)
- `GET /`: List saved requests in the active workspace.
- `POST /`: Save a new request.
- `GET /:requestId`: Fetch saved request details.
- `PATCH /:requestId`: Update request method, URL, headers, params, or body.
- `DELETE /:requestId`: Delete a saved request.
- `POST /:requestId/duplicate`: Duplicate an existing request.
- `PATCH /:requestId/move`: Move request to a different collection or folder.
- `POST /send`: Server-side proxy execution endpoint. Sends the request to the target URL, measures response duration, and returns status, headers, and body.

### Environments (`/api/v1/environments`)
- `GET /`: List all environments for the active workspace.
- `GET /:id`: Retrieve a specific environment and its variable pairs.
- `POST /`: Create a new environment.
- `PUT /:id`: Update environment variables and default status.
- `DELETE /:id`: Remove an environment.
- `POST /:id/duplicate`: Clone an environment.

### History (`/api/v1/history`)
- `GET /`: Fetch request execution logs for the active workspace.
- `DELETE /`: Clear all execution history entries for the active workspace.
- `GET /:historyId`: Retrieve details of a specific execution log.
- `DELETE /:historyId`: Delete an individual history log item.

### System & Diagnostic Endpoints
- `GET /api/v1/health`: System health and MongoDB connection status.
- `ALL /api/v1/echo`: Echo endpoint reflecting method, headers, query params, and body back to caller.
- `GET /api/v1/mock/*`: Mock responses for testing XML, HTML, plain text, delayed latency, and custom status codes.

---

## 14. Development

| Task | Command |
|---|---|
| Install dependencies | `bun install` |
| Full development start | `bun start` |
| Reset database | `bun run seed` |
| Backend only (watch mode) | `bun run dev:backend` |
| Frontend only (Vite) | `bun run dev:frontend` |
| Production build check | `bun --cwd frontend run build` |

---

## 15. Validation

The application has been verified against the official repository verification contract defined in `skills/validate/SKILL.md` and `GUIDELINES.md`:

- **Static Verification (S01–S19)**: Validated standard repository layout, framework preservation, clean package manifests, read-only configuration integrity, launch script existence, and archive bundle size restrictions.
- **Runtime Verification (R01–R12)**: Validated clean automated setup (`bun install && bash setup.sh --seed`), production frontend compilation, backend syntax checks, MongoDB reachability, API health readiness, deterministic collection baseline counts, live user authentication, workspace context switching, end-to-end CRUD persistence, standardized error response schemas (without stack trace leakage), and restart seed reset idempotence.

---

## 16. Submission Notes

- Conforms strictly to the evaluable repository layout outlined in `GUIDELINES.md` and `AGENTS.md`.
- Does not modify or replace the core React + Express (Node/MERN) stack.
- Maintains clean dependency manifests and reproducible startup commands.
- Retains complete, append-only AI pair-programming transcripts exported to `transcripts/log.txt`.

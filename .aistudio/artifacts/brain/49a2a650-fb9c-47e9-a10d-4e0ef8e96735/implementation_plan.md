# Dars with Osama — Development Server Stability & Backend Proxy Resolution

Resolve the development server pre-warming termination error where the standalone Vite CLI exits immediately in non-interactive background environments, ensuring persistent uptime for the online learning platform, audio streaming proxy, and dynamic SEO metadata routes.

## User Review & Critical Decisions

> [!IMPORTANT]
> Because this request targets a clear runtime startup crash (`Pre-warming failed: dev server process died`), no product or visual changes are needed unless you would like additional adjustments. Review the technical stabilization plan below and click **Proceed** to apply the fix.

- **Persistent Server Entry Point (Recommended Default)**: Transition the development and production server startup to a dedicated Express HTTP server listening on port `3000` (`0.0.0.0`) with Vite mounted in middleware mode. This prevents the standalone Vite CLI from terminating when `stdin` closes (`EOF`) in background container runners and avoids duplicate `--port` / `--host` CLI flag conflicts.
- **Preserved Audio Proxy & Dynamic SEO**: Keep both the `/api/gdrive-audio` streaming proxy and dynamic `/session/*` OpenGraph metadata injection active within the Express request pipeline so audio playback and social link previews work identically across development and production.

---

## 1. Overview & Core Concept

- **What It Does**: Stabilizes the application runtime for **Dars with Osama**, an Islamic studies and structured classical text (*kitab*) learning platform featuring video lectures, downloadable PDF study materials, interactive quizzes, article audio streaming, and student/instructor consultations.
- **Target Audience / Persona**: Students (*thalibul 'ilmi*), public readers exploring Islamic scholarship articles and Q&A, and platform administrators managing courses, quizzes, and consultations.
- **Key Value**: Eliminates premature server shutdowns during container pre-warming while preserving seamless Google Drive audio streaming and server-side OpenGraph metadata injection.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Landing & Course Discovery**: Visitors arrive at the home view, browse structured courses by category and level, or explore published articles and public Q&A without interruption.
  2. **Interactive Learning Session**: Enrolled students watch structured video lessons, read bilingual Arabic-Indonesian study notes, download PDF references, and complete automated quizzes to earn certificates.
  3. **Article Audio & Sharing**: Readers stream Google Drive-hosted audio recaps via the built-in audio player and share rich OpenGraph session/article links.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Modern Academic Elegance — blending classical Islamic scholarship typography with a structured, distraction-free learning interface.
  - *Color Palette & Mood*: Follows a disciplined 60-30-10 distribution using Warm Ivory (`#F7F6EF`) and Deep Forest (`#071B16`) as the 60% neutral canvas, subtle bordered structural surfaces (`#FFFFFF` / `#0D261F`) for 30%, and Emerald (`#073B2E`) paired with Classical Gold (`#C9A34E`) for the 10% focal accent budget.
  - *Typography & Hierarchy*: Pairs `Playfair Display` for editorial headers and `Plus Jakarta Sans` for crisp UI body copy, alongside `Amiri` and `Tajawal` with bidirectional isolation (`bdi`) for classical Arabic text.
  - *Component Styling & Layout*: Full-viewport sidebar-and-header workspace layout with balanced 2-column learning stages (65% video/content stage, 35% curriculum & progress deck) and single-elevation card containers.
- **Interactive Feedback & Motion**: Smooth 150–200ms compositor transitions (`transform`, `opacity`), resilient service disruption banners with cooldown-guarded retry controls, and toast notifications for user actions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Express + Vite Middleware Mode vs. Standalone Vite CLI**
  - *Chosen Approach*: Run an Express HTTP server on `0.0.0.0:3000` that mounts Vite in `middlewareMode` during development and serves compiled static assets in production.
  - *Why*: In non-TTY container environments, the standalone Vite CLI listens for `stdin` `end` events and immediately shuts down the process after printing startup URLs. An Express HTTP server maintains an active TCP listener on port `3000` independent of `stdin` closure and cleanly absorbs extra CLI arguments passed by the runner.
  - *Alternatives Considered*: Passing shell stdin keep-alive wrappers to the Vite CLI was rejected because it is brittle across platforms and violates the standard full-stack Express architecture when backend API routes (`/api/gdrive-audio`) are present.
- **Decision 2: Unified Express Middleware for Audio Proxy & Session SEO**
  - *Chosen Approach*: Handle `/api/gdrive-audio` byte-range streaming and `/session/:id` OpenGraph tag injection directly in Express middleware before delegating SPA routes to Vite or static assets.
  - *Why*: Centralizes backend proxy and SSR metadata responsibilities in one predictable request pipeline while keeping `vite.config.ts` focused purely on bundling and frontend plugins.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Express HTTP Server (0.0.0.0:3000)                    │
├───────────────────────┬─────────────────────────┬───────────────────────┤
│  /api/gdrive-audio    │   /session/:identifier  │   SPA & Asset Routes  │
│  Byte-Range Stream    │   Dynamic OpenGraph     │   Vite Middleware /   │
│  Proxy Middleware     │   HTML Meta Injection   │   Static Dist Server  │
└───────────┬───────────┴────────────┬────────────┴───────────┬───────────┘
            │                        │                        │
            ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    React Application (MainApp Router)                   │
├─────────────────┬──────────────────┬──────────────────┬─────────────────┤
│  Home & Course  │  SessionView &   │  BlogListView &  │  Consultation & │
│  Catalog Views  │  QuizView Stage  │  Audio Player    │  Admin Manager  │
└────────┬────────┴────────┬─────────┴────────┬─────────┴────────┬────────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│          Firebase Services (Named Firestore DB + Auth + Cache)          │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Connects to the named Firestore database (`ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93`) with verified fallback snapshots for public courses, sessions, articles, and Q&A entries.
  - Preserves URL-synchronized navigation history (`DarsRouteState`) across courses, sessions, articles, Q&A, student dashboard, and admin management views.
- **Interactive Component & State Mapping**:
  - **Server Startup & Pre-Warming**: Express binds to `0.0.0.0:3000`, responds immediately to pre-warming health/root requests with transformed HTML, and stays alive continuously in background daemon mode.
  - **Audio Streaming Proxy (`/api/gdrive-audio`)**: Validates Google Drive file IDs, forwards `Range` headers, verifies upstream MIME types, and pipes audio streams to the client `<audio>` element.
  - **Session SEO Resolution (`/session/:id`)**: Matches published sessions from the SEO manifest and injects canonical OpenGraph/Twitter tags into `index.html` prior to Vite HTML transformation.

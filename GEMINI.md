# Project Overview: Trip Planner

A specialized web application designed for groups to coordinate trip availability, plan itineraries, manage finances, and communicate. The app features a highly visual, themeable UI with real-time updates powered by Firebase.

## Technology Stack
- **Frontend:** React 19 (TypeScript), Vite 7
- **Styling:** Tailwind CSS 4, CSS Variables for theming
- **Backend/Realtime:** Firebase (Realtime Database, Storage)
- **Utilities:** `date-fns`, `clsx`, `tailwind-merge`, `react-easy-crop`

## Core Architecture
- **Realtime State:** Uses Firebase Realtime Database for group chat, availability (heatmap), and planning data (polls, gallery, finances).
- **Theming Engine:** A custom theming system implemented in `src/index.css` using `[data-theme]` attributes and Tailwind CSS variables. Themes include Light, Dark, Christmas, Halloween, Fiesta, Beach, and Lofi.
- **Component Structure:**
  - `AvailabilityHeatmap.tsx`: Interactive calendar for marking and viewing group availability.
  - `PlanningDashboard.tsx`: Main hub for trip details, polls, finances, and gallery.
  - `GroupChat.tsx`: Real-time communication interface.
  - `ProfileSelector.tsx`: Initial user selection/login.
  - `ThemeSelector.tsx`: Theme switching logic.

---

## Building and Running

### Development
```powershell
npm run dev
```

### Production Build
```powershell
npm run build
```

### Linting
```powershell
npm run lint
```

---

## Development Conventions

### Styling & Theming
- **Surgical Updates:** Always use the defined `--color-skin-*` variables when styling new components to ensure they respect the current theme.
- **Tailwind 4:** Use Tailwind 4 syntax and directives. Avoid hardcoding colors; prefer semantic skin variables.

### Firebase
- Config is located in `src/firebase.ts`.
- Exports `db` (Realtime Database) and `storage` (Firebase Storage).
- Realtime listeners (e.g., `onValue`) should be properly cleaned up in `useEffect` hooks.

### Types & Standards
- **TypeScript:** Strict typing is preferred. Use defined interfaces for Firebase data models.
- **Components:** Functional components with hooks.
- **ESLint:** Project uses `typescript-eslint` and `eslint-plugin-react-refresh`. Run `npm run lint` before committing.

### Shell & CLI
- **No Command Chaining:** Never use `&&` when writing or executing commands.

---

## Project Structure
- `src/assets`: Static assets like logos and icons.
- `src/components`: Reusable UI modules (Heatmap, Chat, Dashboard, etc.).
- `src/firebase.ts`: Firebase initialization and export.
- `src/canvasUtils.ts`: Image processing helpers (used for avatar cropping).
- `src/index.css`: Global styles and theme definitions.
- `src/App.tsx`: Main application shell and routing logic.

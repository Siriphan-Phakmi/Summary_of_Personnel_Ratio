# Development Commands

## Package Manager
- Using **npm** (not yarn)

## Available Scripts
```bash
npm run dev       # Start development server (already running)
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Critical Notes
- Development server is already running on port 3000
- Don't restart `npm run dev` unless explicitly asked
- Always run `npm run build` and `npm run lint` after changes
- No test script configured yet

## Build & Quality Checks
- ESLint with Next.js core-web-vitals rules
- TypeScript strict mode enabled
- Build must pass without errors before deployment
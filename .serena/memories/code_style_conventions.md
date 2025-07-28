# Code Style & Conventions

## Lean Code Philosophy
- **Maximum 500 lines per file** - Split into smaller files if exceeded
- **Waste Elimination**: Remove unused files, functions, or code
- **Reuse**: Leverage existing good code
- **Refactor**: Make code more readable and efficient

## TypeScript Standards
- **Strict mode**: All TypeScript strict settings enabled
- **Type-first development**: Comprehensive typing
- **No any types**: Proper type definitions required

## File Structure
- Feature-based architecture in `app/features/`
- Component composition pattern
- Custom hooks for shared business logic
- Service layer for API and data management

## Naming Conventions
- PascalCase for components and types
- camelCase for functions and variables
- kebab-case for file names
- Descriptive, meaningful names

## Security Requirements
- Input validation on all user inputs
- No hardcoded Firebase keys (use .env.local)
- Role-based access control
- Audit logging for all actions
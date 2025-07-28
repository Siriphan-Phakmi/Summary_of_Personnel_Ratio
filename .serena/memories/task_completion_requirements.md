# Task Completion Requirements

## Essential Steps After Any Code Changes

### 1. Build & Lint Verification
```bash
npm run build    # Must pass without errors
npm run lint     # Must pass ESLint checks
```

### 2. Documentation Updates
Update relevant documentation in `docs/` folder:
- Update fix documentation if fixing bugs
- Update technical specs if changing architecture
- Update AI guidelines if changing development flow

### 3. File Size Check
- Verify no file exceeds 500 lines
- Split files if necessary with proper imports/exports

### 4. Security Validation
- Check input validation
- Verify role-based access control
- Ensure no hardcoded secrets

### 5. Performance Check
- Fast load times
- Minimal API calls
- Optimized Firebase queries

### 6. Testing (if available)
- Currently no test suite configured
- Manual testing required for now

## Critical Notes
- Never commit without successful build
- Always test responsive design changes
- Verify Firebase connections work properly
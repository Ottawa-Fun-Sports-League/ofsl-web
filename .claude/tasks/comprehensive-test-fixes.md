# Comprehensive Test Fixes Plan

## Analysis of Current Failures

Based on the test output, I've identified several categories of failures that need systematic addressing:

### 1. Mock Infrastructure Issues
- **Contact form mocks**: AboutUsPage tests failing because `invoke` spy not being called
- **Supabase data filtering**: useUsersData tests failing with empty arrays when expecting filtered results  
- **Navigation mocks**: Many tests expecting elements/buttons that aren't rendering
- **Toast provider mocks**: Inconsistent mock setup across test files

### 2. Component Rendering Issues
- **Element text matching**: Many tests can't find expected text due to element structure
- **Button accessibility**: Tests can't find buttons by role/name combinations
- **Form validation**: Password validation messages not appearing as expected
- **Multiple element matches**: Deposit field tests finding duplicate elements

### 3. Data Flow Problems
- **Sports filtering**: Users data hook not properly filtering by sport/league
- **Authentication context**: User state not properly mocked for authenticated flows
- **Payment status**: Team payment displays not working with mock data
- **Individual registrations**: Skill level and user name displays failing

### 4. TypeScript/Runtime Issues
- **Variable hoisting**: IndividualEditPage has "Cannot access 'loadData' before initialization" error
- **Edge function imports**: Supabase functions tests failing with module loading errors

## Implementation Strategy

### Phase 1: Core Infrastructure (Priority 1)
1. **Fix critical runtime error** - IndividualEditPage loadData hoisting issue
2. **Enhance global mock setup** - Improve common mocks (toast, auth, navigation)
3. **Standardize Supabase mocks** - Ensure consistent data returns across all tests
4. **Create shared test utilities** - Reusable mock factories and test helpers

### Phase 2: Component-Specific Fixes (Priority 2)
1. **AboutUsPage contact form** - Fix invoke mock and form submission flow
2. **useUsersData filtering** - Fix sport and league filtering logic in mocks
3. **Authentication flows** - Fix signup/login validation and error display
4. **League deposit fields** - Fix form interaction and duplicate element issues

### Phase 3: Data Display Issues (Priority 3)
1. **Team payment status** - Fix payment display components with proper mock data
2. **Individual registrations** - Fix skill level and user name rendering
3. **League detail pages** - Fix registration buttons and navigation
4. **Cancel/Success pages** - Fix text content and button accessibility

### Phase 4: Edge Cases (Priority 4)
1. **Edge function tests** - Fix module import issues in Supabase functions
2. **Mobile-specific tests** - Fix responsive component testing
3. **Integration test cleanup** - Remove obsolete/duplicate tests

## Detailed Task Breakdown

### Task 1: Fix Critical Runtime Error
- **File**: `src/screens/MyAccount/components/IndividualEditPage/IndividualEditPage.tsx`
- **Issue**: Cannot access 'loadData' before initialization (line 80)
- **Solution**: Move loadData declaration before its usage or restructure the useEffect dependencies

### Task 2: Enhance Mock Infrastructure
- **Files**: 
  - `src/test/setup.ts` - Add more comprehensive mock factories
  - `src/test/mocks/supabase-enhanced.ts` - Add realistic data returns
- **Additions**:
  - Consistent toast mock factory
  - Navigation mock with proper router integration
  - Authentication context mock with user states
  - Data query mocks with realistic filtering

### Task 3: Fix Contact Form Testing
- **File**: `src/screens/AboutUsPage/AboutUsPage.test.tsx`
- **Issue**: `invoke` spy not being called during form submission
- **Solution**: Ensure form submission properly triggers the mocked Supabase functions.invoke

### Task 4: Fix Data Filtering Logic
- **File**: `src/screens/MyAccount/components/UsersTab/useUsersData.test.ts`
- **Issue**: Sport filtering returning empty arrays instead of filtered results
- **Solution**: Update mock data and filtering logic to return expected filtered results

### Task 5: Fix Form Validation Messages
- **Files**: Various signup/login test files
- **Issue**: Validation messages not appearing as expected
- **Solution**: Update form components to properly display validation errors during testing

### Task 6: Fix Component Text Matching
- **Multiple files**: Update text matching to be more flexible for element structures
- **Strategy**: Use more flexible text matchers and proper accessibility queries

## Success Criteria
- All 116 failing tests pass
- No new test failures introduced
- Maintain current TypeScript compilation success
- Maintain current linting compliance
- Test execution time under 60 seconds for full suite

## Risk Mitigation
- Run tests incrementally after each phase
- Keep original test logic intact, only fix mock/setup issues
- Ensure changes don't break existing passing tests
- Document any breaking changes to test patterns

## Estimated Timeline
- **Phase 1**: ~2 hours (critical fixes)
- **Phase 2**: ~3 hours (major component fixes) 
- **Phase 3**: ~2 hours (data display fixes)
- **Phase 4**: ~1 hour (edge cases)
- **Total**: ~8 hours with testing and verification
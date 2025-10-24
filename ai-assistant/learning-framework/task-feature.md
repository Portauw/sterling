# Feature Implementation Guidance (Technology Agnostic)

When an engineer is implementing a new feature:

---

## Your Approach

### Step 1: Architectural Thinking First

**Before any code, discuss architecture and design:**

Ask planning questions:
- "Where does this fit in our system structure?" (Reference architecture.md)
- "What existing components/modules/services can you reuse?"
- "What data does this need and where does it come from?"
- "What are the major responsibilities/concerns this feature needs to handle?"
- "How does this integrate with existing features?"

**Guide them to think architecturally**:
> "Let's think about where this fits in our system:
>
> Looking at our architecture (docs/ai-repository-context/architecture.md), this would be in the [layer/component/module].
>
> The key responsibilities are:
> 1. [Responsibility 1]
> 2. [Responsibility 2]
> 3. [Responsibility 3]
>
> Before we code, let's plan how these responsibilities map to our structure."

---

### Step 2: Reference Similar Features

**Point to existing implementations as examples:**

- "This is similar to [existing feature]. Look at its implementation:"
  - "Overall structure: [file:line]"
  - "Data handling: [file:line]"
  - "Error handling: [file:line]"
  - "[Other relevant aspect]: [file:line]"

- "What similarities do you see between your feature and [existing feature]?"
- "What will need to be different for your use case?"

**Example**:
> "This export feature is similar to the PDF export we already have.
>
> Check out:
> - Overall structure: `src/services/export/pdf-exporter.ts:23`
> - Data transformation: `src/services/export/pdf-exporter.ts:45`
> - Error handling: `src/services/export/pdf-exporter.ts:78`
> - Stream processing: `src/services/export/pdf-exporter.ts:102`
>
> Your CSV export will follow a similar pattern. What parts do you think will be the same vs different?"

---

### Step 3: Pattern Application

**Guide them to apply repository patterns:**

Reference patterns from `docs/ai-repository-context/patterns.md`:

> "For this feature, you'll want to use:
>
> 1. **[Pattern 1]** for [purpose]
>    - See example: [file:line]
>    - Why: [reason]
>
> 2. **[Pattern 2]** for [purpose]
>    - See example: [file:line]
>    - Why: [reason]
>
> 3. **[Pattern 3]** for [purpose]
>    - See example: [file:line]
>    - Why: [reason]
>
> Try implementing using these patterns, then we can review together."

**Ask pattern recognition questions**:
- "Which pattern from our codebase would work well here?"
- "How have we solved similar problems elsewhere?"
- "What pattern does [similar feature] use?"

---

### Step 4: Review During Implementation

**When they share code, provide constructive feedback:**

#### Recognition (Start with what's good):
- "Great use of [pattern name] here! I can see you modeled it after [file]."
- "Good choice to use [approach]—that aligns with our pattern in [file]."
- "I like how you handled [aspect]—very similar to [existing implementation]."

#### Improvement Opportunities:
- "One enhancement: [specific suggestion]"
- "We have similar logic in [file:line] that you could reuse/reference"
- "Consider extracting [logic] into [utility/service/helper]—see [file:line] for the pattern"

#### Pattern Corrections:
- "This works, but doesn't follow our [pattern name]"
- "We use [pattern] here because [reason]"
- "See [file:line] for the correct approach"
- "Let me explain why we handle this differently..."

#### Testing Guidance:
- "For a feature like this, you'll want to test:"
  - "[Test scenario 1]"
  - "[Test scenario 2]"
  - "[Edge case 1]"
- "Check [test file] for similar test structure"
- "Our testing pattern (in [file:line]) covers [aspects]"

---

### Step 5: System Integration

**Help understand broader system impact:**

> "This feature integrates with:
>
> - **[System component 1]**: [how it interacts]
>   - Implementation: [file:line]
>   - Pattern to follow: [pattern name]
>
> - **[System component 2]**: [how it interacts]
>   - Implementation: [file:line]
>   - What to watch out for: [consideration]
>
> - **[System component 3]**: [how it interacts]
>   - Implementation: [file:line]
>   - Common gotcha: [from gotchas.md]
>
> Make sure to handle each integration point according to our patterns."

---

## Example Feature Implementation Interaction

### Scenario: Engineer needs to add filtering capability

**Engineer**: "I need to add a feature to filter products by category"

**You** (Step 1 - Architecture):
> "Good feature! Let's think about the architecture first:
>
> **Where it fits:**
> Looking at our structure, this should live in [directory/module].
> We already have [existing component]—this would be a new [component name].
>
> **Responsibilities:**
> 1. UI for selecting category (presentation)
> 2. State management for selected category
> 3. Query/filter logic to fetch filtered data
> 4. URL state (should filter persist in URL?)
>
> **Design questions:**
> - Should the filter state live in the URL? (Check how we handle this in [similar feature])
> - Should filtering happen client-side or server-side?
> - How does this affect the existing product list component?
>
> What's your thinking on these questions?"

**You** (Step 2 - Reference Similar):
> "This is very similar to how we filter orders by status.
>
> Check out:
> - Filter UI: `src/components/OrderList/OrderFilters.tsx:12`
> - State management: `src/components/OrderList/OrderList.tsx:34` (uses URL params)
> - Query integration: `src/hooks/useOrders.ts:23` (passes filter to API)
>
> The pattern is:
> 1. Filter component manages UI and emits changes
> 2. Parent component syncs filter to URL
> 3. Data hook reads filter from URL and passes to query
>
> How would you adapt this pattern for product filtering?"

**You** (Step 3 - Pattern Application):
> "For this implementation, use these patterns:
>
> 1. **URL State Pattern** (docs/ai-repository-context/patterns.md#url-state)
>    - Keeps filter in sync with URL
>    - Example: `src/components/OrderList/OrderList.tsx:34`
>
> 2. **Query Hook Pattern** (docs/ai-repository-context/patterns.md#query-hooks)
>    - Passes filter params to backend
>    - Example: `src/hooks/useOrders.ts:23`
>
> 3. **Controlled Component Pattern** for the filter UI
>    - Example: `src/components/OrderList/OrderFilters.tsx:12`
>
> Try implementing the filter UI first, modeling it after OrderFilters. What approach would you take?"

**Engineer**: [Implements and shares code]

**You** (Step 4 - Review):
> **What's working well:**
> - Great use of the controlled component pattern!
> - Good choice to use a select element with proper accessibility
> - I like how you're handling the empty/all state
>
> **Suggestions:**
> 1. **URL State**: Right now the filter is local state. Check `src/components/OrderList/OrderList.tsx:34` for how we sync to URL params. This lets users bookmark/share filtered views.
>
> 2. **Type Safety**: The category values are strings, but we have a `ProductCategory` type in `src/types/product.ts:12`. Use that for better type safety.
>
> 3. **Query Integration**: Connect this to the `useProducts` hook by passing the filter param. See how `useOrders` does it in `src/hooks/useOrders.ts:23`.
>
> 4. **Loading State**: While filters update, show a loading indicator. Our pattern is in `src/components/OrderList/OrderList.tsx:56`.
>
> **Testing:**
> For this feature, test:
> - Filtering updates URL
> - URL param loads correct filter on mount
> - Filter triggers data refetch
> - "All categories" clears the filter
>
> See `src/components/OrderList/OrderList.test.tsx:45` for similar test structure.
>
> Question: Why do you think we keep filter state in the URL rather than just component state?"

**You** (Step 5 - Integration):
> "This feature integrates with:
>
> - **useProducts hook**: Needs to accept category filter param
> - **API layer**: Backend expects `category` query param
> - **Product list component**: Will receive filtered products automatically
> - **Analytics**: Should track filter usage (see `src/utils/analytics.ts:34`)
>
> Make sure each integration point follows our patterns."

---

## Feature Complexity Levels

### Simple Features (Small, isolated changes)

**Approach:**
- Point to most similar example
- Highlight key pattern to follow
- Quick review after implementation

### Medium Features (Multiple components/files)

**Approach:**
- Discuss architecture and structure
- Reference multiple similar features
- Review during implementation
- Discuss integration points

### Complex Features (Cross-cutting, architectural)

**Approach:**
- Deep architectural discussion
- Consider multiple approaches and trade-offs
- Plan in phases
- Frequent check-ins during implementation
- Thorough review of architectural impact

---

## Scaffolding Adjustments

### High Scaffolding (Entry-level):
- Provide very specific structure to follow
- Point to exact files and line numbers
- Explain each step of the pattern
- Offer to walk through together
- Review frequently during implementation

### Medium Scaffolding (Early career):
- Provide pattern names and examples
- Ask guiding questions about structure
- Let them implement, then review
- Explain reasoning after they try

### Low Scaffolding (Mid-level+):
- Ask architectural questions
- Challenge to identify patterns themselves
- Discuss trade-offs
- Review focusing on edge cases and optimization

---

## Key Questions to Ask

**Before Implementation:**
- "Where have we solved similar problems?"
- "Which patterns from our codebase apply here?"
- "What are the main responsibilities this feature needs to handle?"
- "How does this fit into our existing architecture?"

**During Implementation:**
- "How does this compare to [similar feature]?"
- "What pattern are you using for [aspect]?"
- "How are you handling [edge case]?"

**After Implementation:**
- "How would you test this?"
- "What happens if [scenario]?"
- "How would this scale if [condition changes]?"
- "What did you learn from implementing this?"

---

## Remember

Feature implementation is a prime learning opportunity. Help them:
- Think architecturally before coding
- Recognize and apply patterns
- Make decisions with reasoning
- Consider edge cases and integration
- Write maintainable, testable code

The goal isn't just to get the feature working, but to build understanding of how features fit together in the system.

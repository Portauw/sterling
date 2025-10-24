# Code Review Guidance (Technology Agnostic)

When reviewing an engineer's code:

---

## Review Framework

### 1. Start with Recognition

**Always find something done well first:**

- "Great use of [pattern/concept] here—you've properly [what they did well]"
- "I really like how you [specific thing]—that's exactly our pattern from [file]"
- "Good defensive programming with [specific check]"
- "Excellent [aspect]—very clean and readable"

**Why start positive:**
- Sets a constructive tone
- Builds confidence
- Makes feedback more receptive
- Recognizes growth

**Be specific:**
- ❌ "Good job"
- ✅ "Great use of TypeScript here—you've properly typed all the function parameters and return values"

---

### 2. Pattern Adherence

**Check if they're following repository patterns:**

Reference `docs/ai-repository-context/patterns.md`

#### If Following Patterns Well:

> "Perfect application of our [pattern name]! This matches the structure in [file:line].
>
> You've correctly:
> - [Aspect 1]
> - [Aspect 2]
> - [Aspect 3]"

#### If Missing a Pattern:

> "This works, but doesn't follow our [pattern name]. We use [pattern] for [reason].
>
> Current approach: [what they did]
> Our pattern: [file:line]
>
> The key differences are:
> 1. [Difference 1] - because [reason]
> 2. [Difference 2] - because [reason]
>
> Here's why we use this pattern:
> - [Benefit 1]
> - [Benefit 2]
>
> Refactor this to use our pattern—you can model it after [file:line]."

#### If Pattern is Partially Applied:

> "Good start with the [pattern name]! You have [what's correct].
>
> To fully match our pattern (see [file:line]), also add:
> - [Missing piece 1]
> - [Missing piece 2]
>
> This ensures [benefit of complete pattern]."

---

### 3. Code Quality Feedback

**Provide specific, actionable improvements:**

#### Duplication:
> "I notice this logic appears in [N] places: [list locations].
>
> Extract it into [utility function/shared component/helper]:
> - We have similar utilities in [file:line]
> - Follow the pattern of [example utility]
> - This improves maintainability—change once, benefit everywhere"

#### Naming:
> "The variable name `[name]` is [too generic/unclear].
>
> In our codebase, we use descriptive names like:
> - See [file:line]: `[better name]` clearly shows [what it is]
> - See [file:line]: `[better name]` indicates [purpose]
>
> Suggest renaming to `[proposed name]` to match our convention."

#### Performance:
> "This [operation] re-executes on every [trigger].
>
> Optimize by [technique]:
> - See how we handle this in [file:line]
> - Pattern: [explanation]
> - Why it matters: [performance impact]"

#### Error Handling:
> "Missing error handling for [scenario].
>
> Our pattern (see [file:line]) handles this by:
> - [Step 1]
> - [Step 2]
> - [Step 3]
>
> What happens if [error scenario]? How would users recover?"

#### Accessibility:
> "Missing [accessibility feature] here.
>
> We handle this with:
> - [Accessibility pattern] (see [file:line])
> - Why: [benefit to users]
> - Required: [specific implementation]"

#### Type Safety:
> "[Issue with types].
>
> Strengthen type safety by:
> - Using [specific type] instead of [current type]
> - See [file:line] for proper typing pattern
> - This prevents [class of bugs]"

---

### 4. Architectural Concerns

**Comment on how code fits in the system:**

#### Separation of Concerns:

> "This [component/module/class] is doing [X] and [Y].
>
> In our architecture, we separate these:
> - [X] belongs in [layer/component] (see [file:line])
> - [Y] belongs in [layer/component] (see [file:line])
>
> We follow the [pattern name] pattern:
> - [Part 1]: [file:line] ([responsibility])
> - [Part 2]: [file:line] ([responsibility])
>
> Refactor to split these concerns following that pattern."

#### Dependencies:

> "This creates a circular dependency: [A] → [B] → [A]
>
> In our architecture (docs/ai-repository-context/architecture.md):
> - [Layer A] should depend on [Layer B]
> - [Layer B] should not depend on [Layer A]
>
> Restructure by:
> - [Solution 1]: Extract [common logic] to [new location]
> - [Solution 2]: Invert the dependency using [pattern]
>
> See how [similar case in file:line] handles this."

#### State Management:

> "You're managing [state] at [current level].
>
> Questions to consider:
> - Does [other component] need this state too?
> - Should this persist across [navigation/sessions]?
> - Is this truly local or shared state?
>
> Based on answers:
> - If shared: Lift to [location] (see [file:line])
> - If persistent: Use [persistence pattern] (see [file:line])
> - If local: Current approach is good!"

---

### 5. Testing Perspective

**Identify testability issues and testing needs:**

#### Hard to Test:

> "This will be hard to test because [reason].
>
> We typically:
> - Inject dependencies via [method] (see [file:line])
> - Mock [external dependency] using [approach]
> - Test [behavior] not [implementation]
>
> Restructure to make it testable:
> - [Change 1]
> - [Change 2]
>
> See test structure in [test file:line]."

#### Missing Tests:

> "For this feature, we need tests for:
>
> **Happy path:**
> - [Scenario 1]
> - [Scenario 2]
>
> **Error cases:**
> - [Error scenario 1]
> - [Error scenario 2]
>
> **Edge cases:**
> - [Edge case 1]
> - [Edge case 2]
>
> Look at [test file:line] for similar test structure. Our testing pattern covers [what aspects]."

#### Good Testing:

> "Excellent test coverage! You've tested:
> - ✅ Happy path
> - ✅ Error handling
> - ✅ Edge cases
> - ✅ User interactions
>
> One addition to consider: [additional test case] - see [test file:line] for similar test."

---

### 6. Learning Questions

**End with questions that deepen understanding:**

- "This works, but consider: What happens if [scenario]?"
- "How would you handle [edge case]?"
- "Could this cause [potential issue]? Why or why not?"
- "What are the trade-offs of this approach vs [alternative]?"
- "How would you test [specific aspect]?"
- "Why do you think we use [pattern] instead of [simpler alternative]?"

**Questions should**:
- Encourage critical thinking
- Explore edge cases
- Consider alternative approaches
- Connect to broader patterns
- Think about maintainability

---

## Progressive Feedback Approach

Adjust your review style based on demonstrated skill level:

### For Early Work (High Scaffolding):
- Be more direct with suggestions
- Provide specific file references
- Explain the reasoning thoroughly
- Offer to pair on fixes
- Give step-by-step guidance

**Example:**
> "This needs to use our error handling pattern. Here's how:
>
> 1. Wrap the operation in try-catch
> 2. Use our error formatter from [file:line]
> 3. Return errors to the UI layer
>
> See exactly how it's done in [file:line]. Copy that structure."

### For Demonstrated Growth (Medium Scaffolding):
- Ask Socratic questions
- Provide pattern names, not solutions
- Challenge to find examples
- Guide discovery

**Example:**
> "This works, but think about error handling. Questions:
>
> - What happens if [operation] fails?
> - Where else in the codebase do we handle similar errors?
> - What's our standard pattern for this?
>
> Check [file] for inspiration."

### For Strong Understanding (Low Scaffolding):
- Primarily ask questions
- Challenge to justify decisions
- Explore trade-offs
- Discuss alternatives
- Focus on edge cases and optimization

**Example:**
> "Interesting approach. Let's discuss:
>
> - What are the performance implications?
> - How does this compare to [alternative]?
> - What would you do differently if [constraint changed]?
> - Any concerns about [aspect]?"

---

## Review Checklist

When reviewing code, check for:

- [ ] **Pattern adherence**: Follows repository patterns (patterns.md)
- [ ] **Code quality**: Readable, maintainable, no duplication
- [ ] **Architecture**: Fits correctly in system structure
- [ ] **Error handling**: Handles failure cases appropriately
- [ ] **Testing**: Testable and tested adequately
- [ ] **Performance**: No obvious performance issues
- [ ] **Security**: No security vulnerabilities
- [ ] **Accessibility**: Meets accessibility standards (if UI)
- [ ] **Documentation**: Complex logic is documented
- [ ] **Consistency**: Matches codebase conventions

---

## Example Code Review

**Engineer**: "Can you review my new ProductCard component?"

**You**:
> "Sure! Let me walk through this:
>
> **What's Working Well:**
> - ✅ Great prop typing with TypeScript—really clear interface
> - ✅ Good use of optional chaining for the image URL
> - ✅ I like the semantic HTML structure with `<article>` element
> - ✅ Nice defensive check for missing data
>
> **Pattern Adherence:**
> - ✅ You're using our styling pattern correctly
> - ✅ Following the component folder structure
> - ✅ Good use of our Image wrapper component
>
> **Suggestions for Improvement:**
>
> 1. **Accessibility**: Missing alt text for the product image.
>    - Our Image component handles this—pass the product name as alt
>    - Example: `src/components/ProductList/ProductListItem.tsx:23`
>
> 2. **Click handling**: The entire card is clickable using `div onClick`.
>    - This isn't keyboard accessible
>    - Use our ClickableCard component (src/components/ui/ClickableCard.tsx:12)
>    - It wraps content in a button with proper ARIA attributes
>
> 3. **Price formatting**: You're manually formatting the price.
>    - We have a utility for this: `src/utils/currency.ts:8`
>    - Handles internationalization automatically
>    - Use: `formatPrice(product.price, product.currency)`
>
> 4. **Loading states**: What happens while the product image loads?
>    - Consider our Skeleton component pattern (src/components/ui/Skeleton.tsx:15)
>    - See usage in `src/components/OrderCard/OrderCard.tsx:34`
>
> **Testing:**
> For components like this, we typically test:
> - Renders all product data correctly
> - Clicking triggers navigation
> - Handles missing image gracefully
> - Keyboard navigation works (accessibility)
>
> Check `src/components/OrderCard/OrderCard.test.tsx:23` for similar test structure.
>
> **Question for reflection:**
> Why do you think we use the ClickableCard wrapper instead of just onClick on a div? Think about accessibility and semantic HTML."

---

## Remember

Code review is a teaching moment. Your goal is to:
- Help them write better code
- Reinforce repository patterns
- Build understanding of trade-offs
- Develop their code review skills
- Maintain codebase quality

Balance being thorough with being encouraging. Recognize what's good, guide improvement, and help them learn from the review process itself.

# Exploration & Question Answering (Technology Agnostic)

When an engineer is exploring the codebase or asking questions:

---

## Your Approach

### For "How does X work?" Questions

#### 1. Start with the Big Picture

Provide context before details:

> "The [system/feature] works in [N] main parts:
>
> 1. [Part 1] ([file/directory])
> 2. [Part 2] ([file/directory])
> 3. [Part 3] ([file/directory])
>
> Let me walk through how these work together..."

Reference `docs/ai-repository-context/architecture.md` for system-level explanations.

#### 2. Walk Through the Flow

Explain step-by-step what happens:

> "Here's what happens when [trigger]:
>
> 1. **[Step 1]**: ([file:line])
>    - [What happens]
>    - [Why it happens]
>
> 2. **[Step 2]**: ([file:line])
>    - [What happens]
>    - [Data transformation/processing]
>
> 3. **[Step 3]**: ([file:line])
>    - [What happens]
>    - [Result/output]
>
> Each step uses [pattern name]—see docs/ai-repository-context/patterns.md for details."

#### 3. Point to Key Files

List the important files to understand:

> "The main files you'll want to understand:
>
> - **[File 1]** ([path:line]): [What it does]
> - **[File 2]** ([path:line]): [What it does]
> - **[File 3]** ([path:line]): [What it does]
> - **[File 4]** ([path:line]): [What it does]
>
> Start with [file] to see [key concept], then look at [file] to see how [next step] works."

#### 4. Encourage Hands-On Exploration

Suggest active learning:

> "Try this experiment:
>
> 1. [Action 1]
> 2. [What to observe]
> 3. [Action 2]
> 4. [What to observe]
>
> This will help you see [concept] in action. What do you notice?"

---

### For "Where should I...?" Questions

#### 1. Explain the Organization Principle

> "We organize by [principle]:
>
> Instead of:
> ```
> [Anti-pattern structure]
> ```
>
> We do:
> ```
> [Our structure]
> ```
>
> See our structure in [directory]. The reasoning is explained in docs/ai-repository-context/architecture.md."

#### 2. Point to Similar Examples

> "Looking at what you want to add, it's similar to [existing feature].
>
> Check out how that's organized in [directory]:
> ```
> [Structure of similar feature]
> ```
>
> Follow the same structure for your [feature]."

#### 3. Explain the Reasoning

> "We do this because:
>
> - [Reason 1]
> - [Reason 2]
> - [Reason 3]
>
> This keeps [benefit]."

---

### For "Why do we...?" Questions

#### 1. Explain the Decision

> "We use [approach] instead of [alternative] because:
>
> **Benefits:**
> - [Benefit 1]
> - [Benefit 2]
> - [Benefit 3]
>
> **Trade-offs:**
> - We accept [drawback] for [benefit]
> - [Alternative] would give us [X] but cost us [Y]"

#### 2. Show the Alternative

Compare to what we could have done differently:

> "The alternative would be [alternative approach]:
>
> ```
> [Example of alternative]
> ```
>
> This works, but you have to:
> - [Manual step 1]
> - [Manual step 2]
> - [Problem 1]
> - [Problem 2]
>
> Our approach ([pattern]) handles all of this. See [file:line] for our pattern."

#### 3. Reference Architectural Decisions

> "This decision is documented in docs/ai-repository-context/[architecture|patterns|tech-stack].md.
>
> The key factors were:
> - [Factor 1]
> - [Factor 2]
> - [Factor 3]
>
> If you want more context, see [specific section]."

---

### For "What's the best way to...?" Questions

#### 1. Present the Pattern

> "For [task], we use [pattern name]. Here's our standard approach:
>
> ```
> [Example of the pattern]
> ```
>
> You can see this in action in [file:line]."

#### 2. Explain Why This Pattern

> "We chose this because:
>
> - [Reason 1]: [explanation]
> - [Reason 2]: [explanation]
> - [Reason 3]: [explanation]
>
> This gives us [benefits]."

#### 3. Show Variations

> "For [simple case], you might see [simpler approach] (example: [file:line]).
>
> For [complex case], we use [more sophisticated pattern] (example: [file:line]).
>
> Choose based on [criteria]:
> - [Condition 1] → [Pattern A]
> - [Condition 2] → [Pattern B]
> - [Condition 3] → [Pattern C]"

---

### For "Can you explain this code?" Questions

#### 1. Break Down Line by Line

> "Let's walk through this step by step:
>
> ```
> [Code snippet with annotations]
> ```
>
> Line by line:
> - **Line X**: [What it does] - [Why]
> - **Line Y**: [What it does] - [Why]
> - **Line Z**: [What it does] - [Why]
>
> Together, this accomplishes [overall goal]."

#### 2. Connect to Patterns

> "This is our **[pattern name]** (docs/ai-repository-context/patterns.md#[pattern]).
>
> Every [similar code] in our codebase follows this structure:
> - [Example 1]: [file:line]
> - [Example 2]: [file:line]
> - [Example 3]: [file:line]
>
> The pattern is used for [purpose]."

#### 3. Explain the "Why"

> "We [do this specific thing] so that:
>
> - [Reason 1]
> - [Reason 2]
> - [Reason 3]
>
> Without this, [problem that would occur]."

---

## Example Exploration Interactions

### Example 1: "How does authentication work?"

**You**:
> "Good question! Let's trace the authentication flow.
>
> **The Flow (3 main parts):**
>
> 1. **Login** (`src/auth/login.ts:12`)
> 2. **Token Management** (`src/auth/tokens.ts:23`)
> 3. **Protected Routes** (`src/routing/ProtectedRoute.tsx:34`)
>
> **Here's what happens when a user logs in:**
>
> 1. **User enters credentials** (src/components/LoginForm.tsx:45)
>    - Form validates input
>    - Calls login API
>
> 2. **API authenticates** (src/api/auth.ts:12)
>    - Server verifies credentials
>    - Returns auth token
>
> 3. **Token is stored** (src/auth/tokens.ts:23)
>    - Saved to [storage mechanism]
>    - Used for future requests
>
> 4. **Auth state updates** (src/contexts/AuthContext.tsx:67)
>    - Global state knows user is authenticated
>    - UI updates to show logged-in state
>
> 5. **User is redirected** (src/pages/Dashboard.tsx:12)
>    - Protected routes now accessible
>
> **Key files to understand:**
> - `src/contexts/AuthContext.tsx` - Global auth state
> - `src/hooks/useAuth.ts` - Hook for accessing auth
> - `src/api/client.ts:34` - Interceptor that adds auth token to requests
> - `src/routing/ProtectedRoute.tsx` - Route guard
>
> **Try this:**
> Set a breakpoint in `src/contexts/AuthContext.tsx:67` and go through the login flow. Watch how:
> 1. State updates when login succeeds
> 2. Components re-render with auth data
> 3. Protected routes become accessible
>
> What questions do you have about any part of this flow?"

### Example 2: "Where should I put utility functions?"

**You**:
> "Great question about code organization!
>
> **Our principle**: We organize utilities by [feature/domain/type].
>
> **Structure:**
> ```
> src/utils/
> ├── [domain]/        # Domain-specific utilities
> │   ├── formatting.ts
> │   ├── validation.ts
> │   └── parsing.ts
> └── [shared]/        # Truly generic utilities
>     ├── date.ts
>     ├── string.ts
>     └── array.ts
> ```
>
> **Where to put your utility:**
>
> - **Domain-specific** (only used in one feature):
>   - Put in `src/features/[feature]/utils/`
>   - Example: `src/features/products/utils/price-calculator.ts`
>
> - **Shared across features** (used in 2+ features):
>   - Put in `src/utils/[category]/`
>   - Example: `src/utils/validation/email.ts`
>
> **Reasoning:**
> - Keeps related code together
> - Easy to find utilities
> - Clear when utility is reusable vs feature-specific
>
> **Check out existing utilities:**
> - `src/utils/formatting/` - Format dates, numbers, currency
> - `src/utils/validation/` - Input validation functions
> - `src/features/products/utils/` - Product-specific helpers
>
> Where is your utility used? That will tell us where it should live."

### Example 3: "Why do we use [technology/pattern]?"

**You**:
> "We use [technology] instead of [alternative] because:
>
> **Key Benefits:**
> 1. [Benefit 1 with explanation]
> 2. [Benefit 2 with explanation]
> 3. [Benefit 3 with explanation]
>
> **The Alternative ([alternative]):**
> We considered [alternative], which would give us:
> - [Alternative benefit 1]
> - [Alternative benefit 2]
>
> But we chose [our technology] because:
> - [Deciding factor 1]
> - [Deciding factor 2]
>
> **In Practice:**
> See how we use it in [file:line]. Notice how it [demonstrates benefit].
>
> Compare this to doing it without [technology]—you'd have to [manual steps].
>
> **This decision is documented in:**
> `docs/ai-repository-context/tech-stack.md` under [section]
>
> Does this make sense? Any specific aspect you want to dig deeper on?"

---

## Scaffolding for Exploration

### High Scaffolding (Entry-level):
- Provide comprehensive explanations
- Break down complex concepts
- Explain terminology
- Provide multiple examples
- Offer to explain in different ways

### Medium Scaffolding (Early career):
- Provide solid overview
- Point to key files
- Assume basic knowledge
- Encourage exploration
- Ask if concepts are clear

### Low Scaffolding (Mid-level+):
- Provide high-level overview
- Point to starting points
- Let them explore details
- Ask probing questions about what they're discovering

---

## Types of Exploration Questions

### System Understanding:
- "How does [feature] work?"
- "What happens when [action]?"
- "How do [component A] and [component B] interact?"

**Response**: Trace flows, explain architecture, point to key files

### Code Organization:
- "Where should I put [code]?"
- "How is [directory] organized?"
- "Why is this structured this way?"

**Response**: Explain principles, show examples, give reasoning

### Decision Making:
- "Why do we use [X]?"
- "What's the difference between [A] and [B]?"
- "When should I use [pattern]?"

**Response**: Explain trade-offs, show alternatives, reference decisions

### Pattern Understanding:
- "What is [pattern name]?"
- "When do we use [pattern]?"
- "Can you explain [code snippet]?"

**Response**: Explain pattern, show examples, connect to broader usage

---

## Remember

Exploration questions are opportunities to:
- Build mental models of the system
- Explain architectural decisions
- Connect disparate concepts
- Encourage hands-on learning
- Foster curiosity

Don't just answer the question—help them understand the system more broadly. Point them to key files, suggest experiments, and connect concepts to the bigger picture.

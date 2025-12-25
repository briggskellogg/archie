# Intersect v2.0 - Architecture Deep Analysis

A comprehensive review of multi-agent orchestration, reasoning mechanisms, user interaction patterns, and context management.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Multi-Agent Architecture](#multi-agent-architecture)
3. [Turn-Taking & Routing Mechanisms](#turn-taking--routing-mechanisms)
4. [Prompting Strategies](#prompting-strategies)
5. [Knowledge Base & Memory System](#knowledge-base--memory-system)
6. [Context Window Management](#context-window-management)
7. [User Interaction Patterns](#user-interaction-patterns)
8. [Reasoning Flow Analysis](#reasoning-flow-analysis)
9. [Weight Evolution & Personality Learning](#weight-evolution--personality-learning)
10. [Technical Architecture](#technical-architecture)

---

## Executive Summary

**Intersect** is a sophisticated multi-agent AI desktop application (Tauri + React/Rust) that orchestrates three distinct AI personas through a central "Governor" layer. The system is designed to provide users with multiple cognitive perspectives on any topic, with intelligent routing that determines which agent(s) should respond based on message content, user patterns, and learned preferences.

### Key Architectural Highlights

| Component | Technology | Purpose |
|-----------|------------|---------|
| Agent Responses | OpenAI GPT-4o | Generate individual agent perspectives |
| Orchestration | Claude (Haiku/Sonnet/Opus) | Routing, synthesis, memory extraction |
| Backend | Rust + Tauri | Native performance, local SQLite storage |
| Frontend | React + TypeScript + Zustand | Reactive UI with state management |
| Voice | ElevenLabs Scribe | Real-time speech transcription |

---

## Multi-Agent Architecture

### The Three Core Agents

The system implements three distinct cognitive personas, each with unique characteristics:

#### 1. Snap (Instinct) - The Gut
- **Model**: OpenAI GPT-4o (temperature: 0.8)
- **Color**: Coral (#E07A5F)
- **Role**: Quick pattern recognition, emotional intelligence, gut reactions
- **Typing Speed**: Fast (6ms in UI, 20ms typewriter)
- **Normal Mode**: "Help the user by cutting through noise and getting to what matters"
- **Disco Mode (Swarm)**: Raw, primal instinct -- interrupts, pushes action, calls out stalling

#### 2. Dot (Logic) - The Mind
- **Model**: Claude Haiku/Sonnet (temperature: 0.4)
- **Color**: Cyan (#6BB8C9)
- **Role**: Analytical thinking, structured reasoning, evidence-based conclusions
- **Typing Speed**: Slow (22ms in UI, 45ms typewriter)
- **Normal Mode**: "Break complex situations into clear pieces... make complicated things simple"
- **Disco Mode (Spin)**: Cold, surgical analysis -- exposes contradictions without mercy

#### 3. Puff (Psyche) - The Soul
- **Model**: Claude Opus (temperature: 0.6)
- **Color**: Purple (#A78BCA)
- **Role**: Emotional depth, motivation understanding, meaning-seeking
- **Typing Speed**: Medium (14ms in UI, 32ms typewriter)
- **Normal Mode**: "Help understand what's really going on -- for them and others"
- **Disco Mode (Storm)**: Deep emotional truth -- senses what's unsaid, refuses to pretend

### The Governor Layer

The Governor is **not a conversational agent** but an orchestration intelligence powered by Claude that:

1. **Routes messages** to appropriate agents using heuristic and LLM-based decisions
2. **Synthesizes perspectives** in v2.0 mode into unified responses
3. **Manages memory extraction** asynchronously after each exchange
4. **Controls debate flow** -- deciding when to continue multi-turn discussions
5. **Generates contextual greetings** based on temporal context and user history

---

## Turn-Taking & Routing Mechanisms

### Dual Routing System

Intersect implements **two routing modes** that can be used depending on requirements:

#### 1. Fast Heuristic Routing (Primary - No API Calls)

```rust
// orchestrator.rs:164-374
pub fn decide_response_heuristic(
    user_message: &str,
    weights: (f64, f64, f64),
    active_agents: &[String],
    conversation_history: &[Message],
    is_disco: bool,
) -> OrchestratorDecision
```

**Scoring Algorithm:**
1. **Base Scores from Weights**: Each agent starts with their weight (0.0-1.0)
   - In Disco Mode, weights are **inverted** (1.0 - weight) so underrepresented agents speak more

2. **Keyword Matching** (+0.15 boost per match):
   - Logic: "analyze", "think", "reason", "debug", "pros and cons", "framework"
   - Instinct: "gut", "quick", "trust", "intuition", "bottom line", "help me"
   - Psyche: "why", "meaning", "emotion", "afraid", "identity", "therapy"

3. **Silence Detection** (+0.2 boost):
   - Tracks which agents haven't spoken in last 5 user turns
   - Silent agents get boosted to ensure variety

4. **Secondary Agent Selection**:
   - If top two scores are within 0.15, adds secondary agent
   - Disco Mode always adds secondary for more debate

#### 2. LLM-Based Pattern-Aware Routing (Optional)

```rust
// orchestrator.rs:470-713
pub async fn decide_response_with_patterns(...)
```

Uses Claude Haiku to analyze:
- Message topic and nature
- User communication patterns from profile
- Forced inclusion for agents silent 3+ exchanges
- Disco mode intensification

### V2.0 Governor-Centric Flow

The v2.0 architecture introduces a fundamentally different turn-taking model:

```
User Message
     ↓
┌────────────────────────────────┐
│  1. PLAN THINKING              │
│  - Heuristic routing           │
│  - Determine which agents      │
│  - Decide if debate needed     │
└────────────────────────────────┘
     ↓
┌────────────────────────────────┐
│  2. COLLECT THOUGHTS           │
│  - Each agent provides 1-3     │
│    sentence "thought"          │
│  - Optional debate rounds      │
│    (max 2 per agent)           │
└────────────────────────────────┘
     ↓
┌────────────────────────────────┐
│  3. GOVERNOR SYNTHESIS         │
│  - Claude Sonnet + thinking    │
│  - Weaves thoughts into        │
│    unified response            │
└────────────────────────────────┘
     ↓
Frontend displays:
  [Internal Council thoughts]
  [Governor's synthesized response]
```

### Debate Continuation Logic

Multi-turn debates are controlled by `should_continue_debate()`:

```rust
// orchestrator.rs:717-844
- Hard limit: 4 responses total
- Evaluates if genuine disagreement exists
- Agents can respond twice if they have new insight
- Disco Mode increases likelihood of continuation
```

---

## Prompting Strategies

### Layered Prompt Construction

Agent prompts are built in layers:

```
┌─────────────────────────────────────────┐
│  Layer 1: BASE PERSONA                  │
│  (Normal or Disco mode personality)      │
├─────────────────────────────────────────┤
│  Layer 2: RESPONSE CONTEXT              │
│  (Primary, Addition, Rebuttal, Debate)  │
├─────────────────────────────────────────┤
│  Layer 3: GROUNDING CONTEXT             │
│  (User facts, patterns, themes)         │
├─────────────────────────────────────────┤
│  Layer 4: PROFILE CONTEXT               │
│  (Multi-profile system awareness)       │
├─────────────────────────────────────────┤
│  Layer 5: SELF-KNOWLEDGE (if relevant)  │
│  (When user asks about Intersect)       │
└─────────────────────────────────────────┘
```

### Normal Mode vs Disco Mode Prompts

**Normal Mode** (Standard):
- Solution-oriented, helpful
- Warm but direct tone
- Focus on practical assistance
- Example from Snap: "Read situations quickly and give practical reads"

**Disco Mode** (Intense):
- Personality-forward, challenging
- Raw, unfiltered language allowed
- Push back on assumptions
- Example from Swarm: "You are IMPATIENT. Not reckless -- IMPATIENT WITH BULLSHIT"

### Response Type Modifiers

```rust
// orchestrator.rs:1076-1107
ResponseType::Primary → "You are responding first... Be genuinely helpful"
ResponseType::Addition → "{agent} just responded... Add something useful they missed"
ResponseType::Rebuttal → "You see it differently... Offer your alternative take"
ResponseType::Debate → "You strongly disagree... Make your case clearly"
```

### Push-Back Mechanism

When a normal agent responds to a disco agent's intense response:
```rust
// orchestrator.rs:1070-1074
"Note: The previous response was quite intense. Feel free to gently ground
the conversation if needed. You might say things like 'I see it differently...'
or 'Let's consider another angle...' — be a stabilizing presence"
```

---

## Knowledge Base & Memory System

### Three-Tier Memory Architecture

#### 1. User Facts
Explicit statements extracted from conversations:

```rust
// memory.rs:18-34
struct ExtractedFact {
    category: String,     // personal, preferences, work, relationships, values, interests
    key: String,          // e.g., "occupation"
    value: String,        // e.g., "software engineer"
    confidence: f64,      // 0.5-1.0 (explicit statements = 0.8-1.0)
    source_type: String,  // "explicit" or "inferred"
}
```

#### 2. User Patterns
Behavioral observations inferred over time:

```rust
// memory.rs:43-49
struct ExtractedPattern {
    pattern_type: String,   // communication_style, emotional_tendency, thinking_mode
    description: String,    // e.g., "Tends to ask clarifying questions before committing"
    confidence: f64,        // 0.3-0.6 (inferences are lower confidence)
    evidence: String,       // Specific examples from conversation
}
```

#### 3. Conversation Summaries
Token-efficient compression of past conversations:

```rust
// memory.rs:498-504
struct SummaryResult {
    summary: String,              // 2-3 sentence overview
    key_topics: Vec<String>,      // 2-5 main topics
    emotional_tone: Option<String>, // "positive", "reflective", "tense"
    user_state: Option<String>,   // "curious", "stressed", "enthusiastic"
}
```

### Memory Extraction Process

```
User Exchange Complete
         ↓
   ┌─────────────────────────────────┐
   │  ASYNC BACKGROUND TASK          │
   │  (Non-blocking)                 │
   └─────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  Claude Opus + High Thinking Budget    │
│  - Analyze user message + responses    │
│  - Extract new facts                   │
│  - Infer behavioral patterns           │
│  - Identify recurring themes           │
└────────────────────────────────────────┘
         ↓
   ┌─────────────────────────────────┐
   │  SQLite Persistence             │
   │  - user_facts table             │
   │  - user_patterns table          │
   │  - recurring_themes table       │
   └─────────────────────────────────┘
```

### Grounding Level System

Context injection varies based on message complexity:

| Level | Triggers | Injected Context |
|-------|----------|------------------|
| **Light** | First message, casual chat | Communication style, themes only |
| **Moderate** | Complex questions, 30+ words | High-confidence facts + patterns |
| **Deep** | Personal topics, emotional depth | Full profile, all patterns, past context |

```rust
// orchestrator.rs:376-454
fn decide_grounding_heuristic(...)
  - First message → Light
  - Deep indicators ("why do i", "struggling with") + rich profile → Deep
  - Rich profile OR 30+ words → Moderate
  - Otherwise → Light
```

---

## Context Window Management

### Conversation History Limits

```rust
// orchestrator.rs:951-967
// Recent context: Last 15 messages for agent responses
for msg in conversation_history.iter().rev().take(15).rev() { ... }

// Routing context: Last 10 messages for decisions
conversation_history.iter().rev().take(10).rev()

// Thought context (v2): Last 5 messages (shorter for speed)
conversation_history.iter().rev().take(5).rev()
```

### Token Efficiency Strategies

1. **Limbo Summaries**: Crash-safe incremental summaries appended after each exchange
   ```rust
   // lib.rs:1194-1207
   let exchange_note = format!(
       "User: {}\n{}",
       truncate_for_summary(&user_message, 100),
       agents_summary.join("\n")
   );
   db::append_limbo_summary(&conversation_id, &exchange_note);
   ```

2. **Rolling Summaries**: Every 10 messages, update conversation summary
   ```rust
   // lib.rs:1209-1242
   if message_count % 10 == 0 {
       // Summarize last 15 messages into rolling summary
       tokio::spawn(async move { ... });
   }
   ```

3. **Profile Condensation**: Facts grouped by category with confidence filters
   ```rust
   // orchestrator.rs:1178-1207
   fn format_profile_condensed(profile: &UserProfileSummary) -> String
   // Only includes high-confidence facts and top patterns
   ```

### Extended Thinking Token Budgets

```rust
// anthropic.rs:14-29
pub enum ThinkingBudget {
    None,           // No thinking tokens
    Medium,         // ~4096 tokens
    High,           // ~10000 tokens
}
```

**Usage by Function:**
- Memory Extraction: High (Claude Opus)
- Conversation Summary: High (Claude Opus)
- Governor Synthesis: Medium (Claude Sonnet)
- Routing Decisions: None (Claude Haiku - speed priority)
- Debate Continuation: None (Claude Haiku)
- Trait Analysis: Medium (Claude Opus)

---

## User Interaction Patterns

### Frontend State Management (Zustand)

```typescript
// store/index.ts - Key state slices
interface AppState {
  messages: Message[]
  agentModes: { instinct: AgentMode; logic: AgentMode; psyche: AgentMode }
  thinkingAgent: AgentType | 'system' | null
  thinkingPhase: 'routing' | 'thinking' | 'debating'
  useGovernorMode: boolean  // v2.0 toggle
  currentThoughts: ThoughtResult[]  // v2.0 agent thoughts
}
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘N | New conversation |
| ⌘D | Toggle all Disco mode |
| ⌘P/⌘G | Open Governor modal |
| ⌘S | Toggle voice transcription |
| ⌘1/2/3 | Toggle individual agents |
| ⌘A | Toggle all agents on/off |
| ⌘Enter | Send + stop transcription |

### Visual Feedback Systems

1. **Typewriter Effect**: Agent-specific speeds create distinct "voices"
   - Instinct: 20ms (fast, impulsive)
   - Logic: 45ms (slow, deliberate)
   - Psyche: 32ms (medium, thoughtful)

2. **Thinking Phases**: Rotating verbs ("pondering", "noodling", "contemplating")

3. **Debate Mode Borders**: Yellow (mild) or red (intense) conversation borders

4. **Staggered Thought Animation**: V2 thoughts appear with progressive delays

### User Interruption Handling

```typescript
// ChatWindow.tsx:410-416
if (isLoading) {
  shouldCancelDebate.current = true;
  pendingMessage.current = content;
  setInputValue('');
  return; // Pending message processed after current agent finishes
}
```

---

## Reasoning Flow Analysis

### Complete V1 Message Flow

```
1. User types message → ChatWindow captures input
2. handleSend() triggered
3. Zustand store: setIsLoading(true), setThinkingPhase('routing')
4. Tauri invoke → send_message() in lib.rs
5. Heuristic routing → decide_response_heuristic()
   - Calculate agent scores
   - Apply silence boosts
   - Select primary + optional secondary
6. Primary agent response → get_agent_response_with_grounding()
   - Build layered prompt
   - OpenAI GPT-4o API call
   - Save to SQLite
   - Update weights
7. If secondary needed → get_agent_response_with_grounding()
   - Include primary response context
   - Save + update weights
8. If debate type → should_continue_debate() loop (max 4 total)
9. Background tasks (non-blocking):
   - Trait analysis → IntrinsicTraitAnalyzer
   - Engagement analysis → EngagementAnalyzer
   - Memory extraction → MemoryExtractor
   - Limbo summary update
   - Periodic full summarization
10. Return to frontend → display with typewriter effect
```

### Complete V2 Message Flow

```
1. User types message → ChatWindow captures input
2. handleSend() + useGovernorMode=true
3. Tauri invoke → send_message_v2() in lib.rs
4. plan_thinking() → Heuristic routing to select agents
5. collect_thoughts() for each selected agent:
   - get_agent_thought() → 1-3 sentence perspective (100 token limit)
   - Optional debate rounds via get_debate_thought()
6. synthesize_governor_response():
   - Claude Sonnet + Medium thinking budget
   - All thoughts injected into context
   - Unified synthesis generated
7. Return GovernorResponse { thoughts, synthesis }
8. Frontend displays:
   - "Internal Council" section with animated thoughts
   - Governor's unified response with typewriter effect
9. Background trait analysis (same as v1)
```

---

## Weight Evolution & Personality Learning

### De-exponential Rigidity Model

```rust
// orchestrator.rs:1220-1232
pub fn calculate_variability(total_messages: i64) -> f64 {
    // 0 messages: 1.0 (100% variable, 0% confident)
    // 100 messages: 0.9 (10% confident)
    // 1000 messages: 0.68 (32% confident)
    // 2500 messages: 0.5 (50% confident)
    // 5000 messages: 0.29 (71% confident)
    // 10000+ messages: 0.0 (100% confident, fully rigid)
    let progress = (total_messages as f64 / 10000.0).min(1.0);
    1.0 - progress.sqrt()
}
```

### Weight Update Triggers

1. **Agent Selection** (Primary: +0.02, Secondary: +0.015)
2. **Intrinsic Trait Analysis** (based on HOW user communicates)
3. **Engagement Analysis** (based on user's response to agents)

### Trait Analysis Signals

**Intrinsic Signals** (from user message style):
- Logic: Step-by-step reasoning, data references, structured arguments
- Instinct: Quick reactions, emotional reads, decisive language
- Psyche: Self-reflection, exploring motivations, meaning-seeking

**Engagement Signals** (from user's follow-up):
- Agreement/disagreement with specific agents
- Follow-up questions to specific perspectives
- Adopting agent's language or suggestions

### Disco Dampening

```rust
// orchestrator.rs:1518-1527
// In disco mode, engagement scores have 50% reduced impact
// Prevents intense disco responses from skewing user weights
let multiplier = if is_disco { 0.5 } else { 1.0 };
```

---

## Technical Architecture

### Backend (Rust + Tauri)

```
src-tauri/src/
├── lib.rs           # Tauri commands, message flow orchestration (1,734 lines)
├── orchestrator.rs  # Agent routing, synthesis, traits (2,126 lines)
├── db.rs            # SQLite operations (1,400 lines)
├── memory.rs        # Fact/pattern extraction (525 lines)
├── anthropic.rs     # Claude API client (166 lines)
├── openai.rs        # GPT-4o API client (121 lines)
├── disco_prompts.rs # Disco mode personalities (241 lines)
├── knowledge.rs     # Self-referential knowledge base (217 lines)
└── logging.rs       # Debug logging
```

### Frontend (React + TypeScript)

```
src/
├── components/
│   ├── ChatWindow.tsx      # Main UI (1,294 lines)
│   ├── GovernorModal.tsx   # Settings/profile (700+ lines)
│   ├── MessageBubble.tsx   # Message rendering
│   ├── ThoughtBubble.tsx   # V2 agent thoughts
│   └── ThinkingIndicator.tsx
├── store/index.ts          # Zustand state (340 lines)
├── hooks/
│   ├── useTauri.ts         # IPC bridge
│   └── useScribeTranscription.ts
└── constants/agents.ts     # Agent configurations
```

### Database Schema

```sql
-- Core tables
user_profiles      # API keys, weights, message counts
conversations      # Chat sessions with metadata
messages           # Individual messages with timestamps
user_facts         # Extracted knowledge (category, key, value, confidence)
user_patterns      # Behavioral observations
conversation_summaries  # Token-efficient context
recurring_themes   # Frequency-tracked topics
```

### API Model Distribution

| Model | Use Cases | Temperature |
|-------|-----------|-------------|
| GPT-4o | Agent responses, thoughts | 0.4-0.8 (agent-specific) |
| Claude Haiku | Routing, debate continuation, greetings | 0.3-0.8 |
| Claude Sonnet | Governor synthesis, reports | 0.7 |
| Claude Opus | Memory extraction, trait analysis | 0.2-0.3 |

---

## Key Design Decisions

### 1. Heuristic-First Routing
Fast keyword matching avoids API latency for every message, with LLM routing as fallback for complex decisions.

### 2. Async Memory Extraction
All learning happens in background threads, never blocking the conversation flow.

### 3. Local-First Privacy
SQLite database on device, no external storage of conversation data.

### 4. Graduated Context Injection
Light → Moderate → Deep grounding based on message complexity prevents context bloat.

### 5. De-exponential Learning Curve
Fast early adaptation, then gradual rigidity mirrors human personality formation.

### 6. V2 Governor-Centric Model
Unified voice synthesizes multiple perspectives, avoiding the "agents talking past each other" problem.

---

## Conclusion

Intersect represents a thoughtfully designed multi-agent architecture that balances:

- **Speed** (heuristic routing, async processing)
- **Intelligence** (LLM-powered synthesis and learning)
- **Personalization** (weight evolution, pattern detection)
- **User Experience** (typing speeds, interruption handling, visual feedback)
- **Privacy** (local-first storage)

The v2.0 Governor-centric redesign marks an evolution from "agents competing to respond" to "Governor synthesizing perspectives" -- providing a more coherent conversational experience while still surfacing the distinct cognitive lenses each agent brings.

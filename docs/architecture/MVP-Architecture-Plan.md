# WAO MVP Bot Architecture Plan (Flow C: Google Ads Setup)

This plan outlines the architecture for the Phase 1 MVP Bot, utilizing your $200 Azure OpenAI credits to build the core intelligence engine. We are focusing exclusively on **Flow C (Google Ads Setup via MCC)** as the first prototype because it offers immediate, measurable ROI to the novice business owner.

## 1. Interaction Model (The "Antigravity" Loop)
Since the user is an absolute novice, the bot will act as a patient, vocal expert speaking/chatting entirely in Hebrew.

1. **Diagnosis (Hebrew)**: The bot converses with the user in natural, spoken Israeli Hebrew (text & voice) to understand their business niche, service radius, and target budget.
2. **Strategy Generation**: The bot silently runs the hybrid specialist agents to compile:
   - **Target Locations**: Determined by business range (e.g., specific cities/districts in Israel or nationwide).
   - **Daily Budget Formula**: Calculated based on the user's monthly target and industry CPC benchmarks.
   - **Keyword Targets**: Highly relevant keyword list.
   - **Negative Keyword Seed List**: Strategic negatives (e.g., "jobs", "free", "course", and industry-specific irrelevant terms) to prevent wasteful phrase-match spend.
   - **Ad Copy**: Headlines and descriptions optimized in Sabra copywriting style.
3. **Artifact Review**: The bot renders a visual, easy-to-understand mockup (in Hebrew) of the proposed Google Ad and settings (Target Location, Daily Budget, Keywords, and Negative Keywords) on the screen, accompanied by Hebrew voiceover.
4. **Execution**: The user clicks "Approve" (or says "Yes" in Hebrew), and the bot securely fires the Google Ads API calls via your MCC token.

## 2. Language Policy
- **User-Facing UI & Voice (Hebrew)**: All conversation, chat inputs, generated ad previews, budget options, and voice narration are strictly in native Hebrew.
- **Agent Logs & Code (English)**: The underlying LLM system prompts, developer console, API JSON schemas, and code comments are in English, adhering to our communication rules.

## 2. Business Logic: The MCC Advantage
The bot will use WAO's Google Ads MCC Developer Token. When a user approves a campaign:
- The bot creates a child account under the WAO MCC.
- The bot injects the WAO Partner Welcome Bonus (e.g., spend $500, get $500) into the account automatically.
- The bot invites the user as an Admin so they maintain 100% ownership, adhering to the Vision rule: *"WAO operates everything. Clients own everything."*

## 3. Architecture Analysis: Monolithic vs. Multi-Agent

You raised a crucial point regarding Azure Tier 1 limits and long-term business profitability. 

### Option A: The Monolithic Prompt (Single Call)
- **Pros:** Cheapest on API credits. Fastest response time.
- **Cons:** Very dangerous for a novice user. A single prompt trying to juggle PPC strategy, sabra copywriting, and API JSON formatting will inevitably hallucinate or output generic, low-converting ads.

### Option B: Multi-Agent Orchestration (The WAO Team)
- **Pros:** Extremely high quality and safe. The Orchestrator routes tasks to specialists (Dror for keyword math, Tamar for persuasive copy). 
- **Cons:** More API calls per turn = higher token cost.

### 💡 The Recommended Hybrid Solution (Cost-Effective Scale)
To balance your Azure Tier 1 limits with the need for expert-level quality, we will use a **Model-Tiering Hybrid Strategy**:
1. **The Orchestrator (Adam)** runs on **GPT-4o-mini**. It is incredibly cheap ($0.15 per 1M tokens) and perfectly capable of routing conversations and rendering JSON artifacts.
2. **The Specialists (Dror & Tamar)** run on **GPT-4o (Standard)**. They are only invoked when heavy lifting is required (e.g., Tamar writes the actual ad copy once, which costs maybe $0.02).

**Profitability impact**: A complete onboarding flow will cost less than $0.10 in Azure credits per user. This easily supports a freemium/trial model, leaving plenty of margin for a paid subscription upgrade.

---

## Next Steps

If you approve this structure, our next step will be to write the system prompts for the Orchestrator (Adam) and hook them up to a simple web interface (Next.js) so you can actually talk to the bot and test Flow C locally.

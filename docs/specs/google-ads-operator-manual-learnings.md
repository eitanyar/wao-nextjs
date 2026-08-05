# Google Ads Operator — Manual Learnings Log

Successful manual optimizations that improve client outcomes should be captured here so the automation
engine can learn and generalize these patterns in future task recommendations.

**Purpose:** This is the feedback loop from real-world G-Ads work back into the bot. Every entry here
represents a data point the operator didn't have — once documented, Eitan-Dev can trace the decision
back to the outcome and make the next iteration smarter.

---

## Template Entry

```
### Date: [YYYY-MM-DD] | Client: [retter/aasada/...] | Approver: [Name]

**What Changed:**
[Describe the manual optimization — e.g., "Expanded match types on brand campaign from Exact to Phrase + Exact"]

**Metric Impact:**
- CPL: [before] → [after] ([% change])
- ROAS: [before] → [after] ([% change])
- Spend: [before] → [after]
- Leads: [before] → [after]

**Why It Worked:**
[Reasoning — e.g., "High-intent searches with low volume were filtered by exact-match threshold.
Phrase match captured the same intent with broader coverage, reducing cost per qualified lead."]

**Generalization for Automation:**
[What pattern should the bot learn? E.g., "For non-brand campaigns with CPL above ceiling but high quality,
test phrase/broad expansion before recommending budget cuts."]

**Task Recommendation That Could Have Caught This:**
[Which task in buildGoogleAdsOperatorTasks() should reference this learning? E.g., "search_term_expansion" or "bid_strategy_tune"]
```

---

## Entries

*None yet — first manual optimizations coming as Retter and AAAsada campaigns run live.*


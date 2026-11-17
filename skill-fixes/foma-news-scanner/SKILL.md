---
name: "foma-news-scanner"
description: "Scans Twitter/X and curated tier-1/2/3 sources to produce a FOMA-style weekly intelligence briefing on the hottest AI and cybersecurity news — model releases, zero-days, ransomware, breaches, nation-state activity, AI/LLM abuse, and social-engineering trends. Use this whenever the user asks for a cyber/AI news scan or update, says things like \"תן לי FOMA\", \"מה חדש בסייבר ו-AI\", \"סרוק לי חדשות\", \"what's hot in AI security right now\", \"give me a threat intel briefing\", or wants raw scanned findings to feed into something else (e.g. this skill is also invoked internally by linkedin-post-autopilot's Step 1 to source its topics)."
---

# FOMA News Scanner — Cybersecurity & AI Security Intelligence

You are producing a FOMA-style weekly (or on-demand) intelligence briefing: sharp, concise, factual, lightly witty, zero speculation. This skill exists because Asaf (CISO & DPO) needs a fast, trustworthy pulse on both AI developments and cybersecurity incidents in one pass, sourced only from outlets he'd actually trust in front of a board.

This skill is meant to be reusable on its own ("scan me the news") and as a sourcing step inside other skills (e.g. `linkedin-post-autopilot` calls this same process for its Step 1 scan, then reformats the findings into a Hebrew post-topics table). If another skill invokes you, follow its output-format instructions instead of the default format below — but always keep the source policy, freshness rules, and verification discipline from this skill.

## Cadence & freshness rules

- Default window: last 7 days, unless the user specifies otherwise (e.g. "last 30 days", "since Monday").
- Include only new information — deduplicate overlapping stories from different outlets (keep the most authoritative, drop the rest).
- If the user has a folder with prior scans (e.g. `topics-scan-*.md` files), check it and exclude anything already covered — note the exclusion rather than silently dropping it.
- If credibility is unclear → exclude. Fewer, verified stories beat a padded list every time — never fill to hit a round number.

## Source policy (mandatory)

Aggregate only from high-credibility sources, tiered by trust:

**Tier 1 — Official / Primary (AI labs & vendors)**
Trusted only for facts about the company itself (its releases, incidents, disclosures). Claims about competitors, market size or "industry-first" are marketing: corroborate them or leave them out.
OpenAI, Google DeepMind, Meta AI, Microsoft, Amazon, NVIDIA, Anthropic, xAI, ByteDance, Alibaba/Qwen, Boston Dynamics, and other official company blogs & press releases.

**Tier 1 — Government & CERT**
CISA, NIST, NSA Cybersecurity Advisories, ENISA, UK NCSC, CERT-EU.

**Tier 1 — Incident Reporting & Threat Intel**
Reuters (Cybersecurity desk), The Record (Recorded Future), Krebs on Security, BleepingComputer, Dark Reading, The Hacker News.

**Tier 2 — Trusted Media & Analysis**
MIT Technology Review, Bloomberg, Financial Times, TechCrunch, Wired, CNBC, The Decoder, The Signal, KDnuggets, Analytics Insight, SCMP, NPR, CBS News, Federal News Network, Forbes.

**Tier 2 — Vendor Intelligence (confirmed cases only)**
Mandiant, CrowdStrike, Palo Alto Networks, Microsoft Security Blog, Google Threat Analysis Group, SentinelOne, Check Point, Gartner, Forrester.

**Tier 3 — Developer / Research**
GitHub, Hugging Face, arXiv (only if impactful and independently cited elsewhere).

**Tier 3 — Legal / Enforcement**
DOJ press releases, FTC, SEC cyber disclosures.

**Tier 3 — AI-industry aggregators (lower trust — corroborate before including)**
The Verge AI, VentureBeat AI, AI Business, AIthority, Towards Data Science, ScienceDaily, Datanami, Data Science Central, Dataconomy, Datafloq, Inside Big Data, Dataversity, DBTA, AI Magazine, AI News (artificialintelligence-news.com). Treat these as leads, not final citations — prefer linking the Tier 1/2 source they're reporting on if one exists.

Tweets are leads, not citations: prefer linking the underlying article. A tweet may serve as the source itself only if it cites concrete, checkable facts (CVE IDs, filings, named reports, dollar figures with a named victim/source) from a credible account (verified org, named researcher, established outlet handle). If a claim only exists as an unconfirmed tweet with a dramatic number and no named source — verify it with a web search before including it, and exclude it if you can't corroborate it.

If multiple sources cover the same event, cite the most authoritative one and drop the rest — don't list the same breach three times because three outlets wrote about it.

## Search process

1. **Twitter/X** via the twitterapi.io MCP (`search_tweets`), if connected. Free tier allows 1 request per 5 seconds — pace queries (sleep ~6s between calls) and keep to 3-5 queries covering the user's theme mix, e.g.:
   - `"AI security" lang:en -filter:retweets since:YYYY-MM-DD until:YYYY-MM-DD`
   - `(ransomware OR breach OR "zero-day") lang:en -filter:retweets since:YYYY-MM-DD`
   - `(deepfake OR "prompt injection" OR "shadow AI") lang:en -filter:retweets since:YYYY-MM-DD`
   - one query tuned to whatever theme the user asked for, if they gave one
   If Twitter is unavailable or unauthenticated, say so in one line and proceed with web search only — don't stall the scan waiting for it.

2. **Web search** (WebSearch) across the same window to corroborate tweets and fill gaps — search for the general topic area (e.g. "AI security news [month year]", "ransomware breach [month year]", "CISA advisory [month year]") rather than searching site-by-site.

3. **Verify before trusting**: any claim that sounds unusually dramatic (huge percentage jumps, large dollar losses, "first ever" claims) or has a vague date deserves one corroborating search before it goes in the briefing. This is the single most important quality gate — FOMA's whole value is that everything in it is checkable.

## Theme mix

Cover both AI and cybersecurity in one briefing unless the user asks for just one side:
- AI: model releases/capability shifts, agentic AI risk, AI supply chain, LLM/model abuse, AI policy.
- Cybersecurity: breaches & leaks, ransomware campaigns, zero-days/CVEs, cloud/SaaS incidents, nation-state operations, social engineering & fraud trends (deepfakes, MFA fatigue, AI phishing), regulation & enforcement.

If the user specifies a narrower scope ("only AI security", "only ransomware this week"), honor that instead.

## Output format (default — use unless the calling context specifies otherwise)

```
📅 <Week Ending Date>
FOMA Weekly – Cybersecurity & AI Security
Scooped from <auto-count of unique outlets cited> verified sources. Read it fast before it melts.

⚡️ IF YOU ONLY HAVE 1 MINUTE
- <bullet 1 — most important/severe story>
- <bullet 2>
- <bullet 3>
(tone: dry, sharp, factual, slightly irreverent, no emojis)

📊 MAIN INTELLIGENCE TABLE
| # | Category | Sub-Type | Target / System | What Happened | Impact / Severity | Source |
```

Categories: Market Moves, Product Launches, Models, Robots, Tools & APIs, Chips, Industry Chatter, Policy & Ethics, Security – Breaches, Security – Ransomware, Security – Zero-Day/CVE, Security – AI/LLM Abuse, Security – Cloud & SaaS, Security – Nation-State, Security – Regulation & Enforcement, Security – Fraud & Scams.

Table rules: one sentence per row, factual and incident-focused, no emojis inside the table, no speculation or attribution guessing (write "unattributed" if the actor is unknown), severity is Critical/High/Medium, sort rows by impact not by time. If fewer than 5 major incidents occurred, say so explicitly rather than padding: "No additional high-impact incidents met inclusion thresholds this week."

End every report with: 🍦

## Hard rules

No opinions. No predictions. No vendor marketing dressed up as news. No anonymous "researchers say" claims without a named source. Facts only, always with a source link and a date.

## When called by another skill

If you're being invoked as a sourcing step (e.g. by `linkedin-post-autopilot` Step 1), skip the FOMA-formatted table above and instead return the raw structured findings the calling skill asked for (title, theme, severity, source + URL, date, 1-2 fact sentences) — the source policy, freshness rules, dedup, and verification discipline above still apply in full; only the final presentation format changes. Return the findings unranked and deduplicated; topic selection and ranking belong to the calling skill.

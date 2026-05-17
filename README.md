# 🛡️ Ultimate AI Security Framework

A comprehensive, interactive 5-layer security framework for assessing and mitigating AI/LLM security risks in enterprise environments.

## 🌐 Live Demo

**[Launch the Framework](https://batman100000.github.io/Ultimate-AI-Security-Framework/)**

## 📋 Features

### Interactive Visualizer
- Defense-in-depth onion diagram with 5 concentric security layers
- Click any layer to inspect threats, attack surfaces, and mitigation controls
- Animated glow effects and layer dimming for focused exploration

### Risk Assessment Engine
- 8-question intake form covering users, data sensitivity, hosting, autonomy, fine-tuning, integrations, and use case
- Per-layer risk scoring algorithm (0-100 per layer)
- Overall risk classification: LOW / MEDIUM / HIGH / CRITICAL
- Auto-generated priority recommendations by severity

### Dynamic Security Guidelines
- Guidelines regenerate based on your assessment results
- Covers: SSO/MFA, GDPR, CCPA, HIPAA, data residency, PII scrubbing, BOLA prevention, supply chain security, and more
- Context-aware: medical use cases get HIPAA controls, public-facing systems get prompt injection defenses, agentic systems get HITL gates

### Implementation Playbook
- 5-phase roadmap customized to your risk profile
- Highlights your top-risk layers with specific remediation tasks
- Phase-specific compliance testing (GDPR audit, HIPAA assessment, red-teaming)

## 🏗️ The 5-Layer Model

| Layer | Focus | Key Threats |
|-------|-------|-------------|
| **1. Data** | Storage, embeddings, PII | Data poisoning, membership inference, PII leakage |
| **2. Model/LLM** | Weights, inference, alignment | Jailbreaks, prompt injection, hallucinations |
| **3. Application** | Agents, tools, APIs | BOLA, overprivileged agents, session hijack |
| **4. Infrastructure** | Network, compute, secrets | DDoS, credential exposure, supply chain |
| **5. Compliance** | Governance, audit, legal | GDPR violations, bias, lack of audit trail |

## 🚀 Quick Start

1. Open `index.html` in any modern browser
2. Click layers in the **Interactive Visualizer** to explore threats and controls
3. Fill out the **Risk Assessment** form and click "Analyze System Risks"
4. Review your customized **Security Guidelines** and **Implementation Playbook**

## 🛠️ Technology

- Pure HTML/CSS/JavaScript — no dependencies, no build step
- Single-file deployment
- Works offline after first load
- Responsive design (desktop, tablet, mobile)

## 📄 License

MIT License

## 👤 Author

Built for AppSec, DevSecOps & Security Engineering Teams.

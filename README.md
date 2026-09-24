ASTRA
Advanced Sustainable Technology & Resource Analytics

A carbon-aware engineering platform that helps developers identify compute inefficiencies, estimate cost and carbon impact, and make more sustainable decisions before deployment.

📌 Overview

Modern software—especially AI/ML applications—can consume significant amounts of compute, energy, and cloud resources.

ASTRA helps developers understand the potential cost, energy consumption, and carbon impact of their code and workloads during development, rather than discovering inefficiencies only after deployment.

ASTRA combines:

🔍 Code analysis
⚡ Compute and energy estimation
🌍 Carbon impact estimation
🤖 AI-powered optimization suggestions
🚦 CI/CD sustainability guardrails
📊 Visualization and analytics

The goal is to make sustainability part of the software development lifecycle, alongside performance and cost.

🎯 Problem

Developers commonly optimize software for:

Performance
Scalability
Reliability
Cloud cost

However, the environmental impact of those decisions is often difficult to see during development.

Common sources of unnecessary resource consumption include:

Repeated or unnecessary API calls
API calls inside loops
Redundant computation
Inefficient ML training and inference
Over-provisioned infrastructure
Poor deployment-region selection
Lack of visibility into carbon impact before deployment

ASTRA provides developers with sustainability insights directly within their development workflow.

🚀 What ASTRA Does

ASTRA follows four main steps:

1. Measure 🔍

Analyze source code and workloads to identify potentially expensive operations.

Examples:

API calls
Nested loops
Recursive operations
Large data processing
ML workloads
2. Estimate ⚡

Estimate:

Compute requirements
Energy consumption
Cloud cost
Carbon emissions
3. Optimize 🤖

Provide recommendations such as:

Caching repeated API responses
Batching requests
Reducing unnecessary computation
Using smaller or lower-precision models
Selecting lower-carbon regions
Scheduling workloads during lower-carbon periods
4. Enforce 🚦

Integrate sustainability policies into CI/CD pipelines.

For example:

Set carbon budgets
Set cost thresholds
Detect inefficient changes
Prevent pull requests from exceeding defined limits
✨ Key Features
1. VS Code Intelligence

ASTRA integrates with the developer workflow through a VS Code extension.

It can analyze code and provide insights about:

API usage
Compute-heavy operations
ML workloads
Potential optimization opportunities
Estimated energy and carbon impact
2. API Overuse Detection

ASTRA identifies potentially inefficient API usage patterns such as:

Repeated API calls
API calls inside loops
Missing caching
High-frequency polling

It can recommend techniques such as:

Caching
Batching
Debouncing
Rate limiting
3. Compute Hotspot Analysis

ASTRA uses static analysis and heuristics to identify code that may require significant computation.

It analyzes patterns such as:

Nested loops
Recursive functions
Large dataset operations
Heavy ML operations

The analysis can be represented through:

Call graphs
Execution heatmaps
Compute-weight attribution
4. ML Workload Estimation

ASTRA estimates the environmental impact of ML workloads such as:

Model training
Inference
Fine-tuning
Batch processing

A simplified estimation model is:

Energy = GPU Power Draw × Utilization × Runtime

Carbon Emissions = Energy × Regional Carbon Intensity

The estimates depend on hardware characteristics, workload duration, utilization, and regional carbon intensity.

5. Pre-Deployment Digital Twin

ASTRA can be used to compare potential deployment scenarios before deployment.

Examples include:

Changing cloud regions
Increasing traffic
Replacing a model
Upgrading hardware

The system compares the expected:

💰 Cost
⚡ Energy consumption
🌍 Carbon emissions

This allows teams to evaluate infrastructure decisions before production deployment.

6. Carbon-Aware Recommendations

ASTRA provides optimization recommendations while considering application requirements.

Potential recommendations include:

Smaller models
Lower-precision models
More efficient batching
Lower-carbon deployment regions
Low-carbon scheduling windows

Recommendations can take constraints such as:

Latency
Accuracy
Performance

into account.

7. CI/CD Carbon Guardrails

ASTRA can integrate with GitHub Actions to introduce sustainability policies into CI/CD.

Examples:

Pull Request
     ↓
Code Analysis
     ↓
Compute / Cost / Carbon Estimation
     ↓
Policy Check
     ↓
Pass / Warning / Block

Possible policies include:

Maximum carbon budget
Maximum estimated cost
Maximum compute threshold

This enables sustainability as policy-as-code.

🏗️ Architecture

ASTRA is organized into multiple layers:

┌─────────────────────────────────────────────┐
│              Developer / VS Code            │
│             IDE Extension                   │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│             Static Analysis                 │
│       AST Parsing & Pattern Detection       │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│           Intelligence Engine               │
│      Functions • DAGs • Compute Weight      │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│            Estimation Engine                │
│      Cost • Energy • Carbon Estimation      │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│             AI Optimization                 │
│       LLM • RAG • Recommendations            │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│             Web Dashboard                   │
│       Analytics • Heatmaps • Graphs         │
└─────────────────────────────────────────────┘
Layer 1 — IDE Extension

Technology: TypeScript, VS Code Extension API

Responsible for:

Monitoring source code
Triggering analysis
Providing developer-facing feedback
Layer 2 — Static Analysis

Responsible for identifying code patterns using:

AST parsing
Code pattern detection
Loop tracking
API call tracking

Technologies include Tree-sitter / TypeScript Compiler API.

Layer 3 — Intelligence Engine

Builds a representation of application behavior using:

Function relationships
Service relationships
Directed graphs / DAGs
Compute-weight attribution
Layer 4 — Estimation Engine

Technology: Python + FastAPI

Responsible for:

Cost estimation
Energy estimation
Carbon estimation
Regional carbon-intensity mapping
Layer 5 — AI Optimization

Uses LLM-based reasoning and RAG to:

Explain detected issues
Generate optimization suggestions
Provide structured recommendations
Layer 6 — Dashboard

Technology: React / Next.js

Provides visualizations such as:

Cost vs. carbon comparisons
Heatmaps
Flow graphs
Sustainability metrics
📊 Estimation Methodology

ASTRA uses approximate models to estimate resource impact.

Compute-Heavy Operations
Compute Time × Hardware Power Draw
                    ↓
                Energy
                    ↓
Energy × Carbon Intensity
                    ↓
             Carbon Emissions
API Workloads

API impact can be approximated using:

API Frequency × Server Compute Approximation
ML Training

For ML workloads:

GPU TDP × Training Hours × Carbon Intensity

These calculations are estimates rather than direct measurements of actual production emissions.

🎯 Supported Workloads

ASTRA is designed to analyze workloads such as:

API-driven backend systems
AI/ML training
AI/ML inference
Data-processing pipelines
Batch jobs
Microservices
Cloud infrastructure configurations
📁 Project Structure

The repository contains the major components of ASTRA:

Astra/
│
├── .github/
│   └── workflows/          # CI/CD workflows
│
├── .vscode/                # VS Code configuration
│
├── assets/                 # Project assets
│
├── example/                # Example implementations
│
├── vscode-extension/       # ASTRA VS Code extension
│
├── web-dashboard/           # Dashboard application
│
├── web/
│   └── frontend/            # Web frontend
│
├── .astra.json              # ASTRA configuration
├── .astra-report.md         # Analysis report
├── .env.example             # Environment variable template
└── README.md
🛠️ Tech Stack
Area	Technologies
IDE Extension	TypeScript, VS Code Extension
Frontend	React, Next.js
Backend	Python, FastAPI
Static Analysis	AST Parsing, Tree-sitter / TypeScript Compiler API
AI	LLM, RAG, Google Gemini
Visualization	React / Next.js
Database	MongoDB
CI/CD	GitHub Actions
Configuration	Environment Variables
⚙️ Getting Started
Prerequisites

Install:

Python 3.10+
Node.js 18+
npm
MongoDB Atlas — optional
Google Gemini API key — optional for AI features
1. Clone the Repository
git clone https://github.com/JKSANJAY27/Astra.git
cd Astra
2. Start the Backend

Navigate to the backend directory:

cd backend

Create a virtual environment:

python -m venv venv
Windows
venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

If required, create a .env file and configure:

GOOGLE_GEMINI_API_KEY=your_api_key

Start the FastAPI server:

uvicorn app.main:app --reload

Backend:

http://localhost:8000
3. Start the Frontend

Open another terminal and navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Frontend:

http://localhost:3000
📈 Reported Project Metrics

The current project documentation reports the following target/observed improvements:

Metric	Reported Improvement
Unnecessary Compute	60% reduction
Cloud Costs	40% lower
Redundant API Calls	75% fewer

These figures should be interpreted in the context of the project's evaluation/setup and may vary depending on workload and infrastructure.

🌱 Sustainability Impact

ASTRA is designed to help reduce unnecessary resource consumption by identifying inefficient workloads before deployment.

Potential benefits include:

Reduced unnecessary computation
Fewer redundant API calls
More efficient ML workloads
Better cloud-resource utilization
More informed region selection
Lower infrastructure costs
Reduced energy consumption
Lower estimated carbon emissions
🔮 Future Scope

Planned or potential extensions include:

Autonomous optimization agents
Real-time runtime carbon adaptation
Cloud-provider integrations
Kubernetes carbon-aware scheduling
Green compute marketplace
⚠️ Limitations

Carbon and energy estimation is inherently approximate.

ASTRA's estimates depend on:

Hardware power models
Workload characteristics
Runtime estimates
Regional carbon-intensity data
Quality of available benchmarks

To improve reliability, the project proposes:

Using published power benchmarks
Keeping estimates conservative
Providing confidence intervals
🤝 Contributing

Contributions are welcome.

Fork the repository
Create a feature branch
git checkout -b feature/your-feature
Make your changes
Commit your changes
git commit -m "Add your feature"
Push the branch
git push origin feature/your-feature
Open a Pull Request
📄 License

This project is licensed under the MIT License.

See the LICENSE file for details.

💡 One-Line Description

ASTRA is a carbon-aware engineering platform that analyzes software workloads, estimates cost and environmental impact, and helps developers build more resource-efficient systems before deployment.

👥 Contributors

ASTRA was developed collaboratively by:
akanksha-bharti579
JKSANJAY27
HARIPRASAD-04
Developer-Devanshhh
Kashish-Bhatia

Built with ❤️ for sustainable software engineering.

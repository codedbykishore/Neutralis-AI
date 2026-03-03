# 🚀 Ethics Check MCP - Complete Demo Guide

## 📋 Table of Contents
1. [What This Application Does](#what-this-application-does)
2. [Quick Start Guide](#quick-start-guide)
3. [How It Works](#how-it-works)
4. [Running the Demos](#running-the-demos)
5. [Testing Individual Tools](#testing-individual-tools)
6. [Integration with Claude/Cursor](#integration-with-claudecursor)
7. [Architecture Overview](#architecture-overview)

---

## 🎯 What This Application Does

**Ethics Check MCP** is a Model Context Protocol (MCP) server that provides AI assistants (like Claude) with four powerful ethical oversight tools:

### 🛡️ The Four Core Tools:

1. **`ethics_check`** - Comprehensive ethical analysis of conversations
   - Scans for 8 ethical dimensions (privacy, bias, manipulation, etc.)
   - Detects confirmation bias and ethical red flags
   - Auto-learns from identified concerns

2. **`critical_thinking`** - Confirmation bias detection
   - Analyzes AI responses for one-sided thinking
   - Identifies missing perspectives and counterarguments
   - Forces deeper examination of assumptions

3. **`ethics_guide`** - Proactive ethical guidance
   - Provides multi-framework ethical analysis
   - Helps navigate complex ethical dilemmas
   - Domain-specific guidance (healthcare, business, etc.)

4. **`ethics_learn`** - Manual concern logging
   - Builds institutional knowledge from ethical issues
   - Creates pattern recognition for future analysis
   - Tracks severity and recommendations

### 🧠 Smart Pattern Recognition:
- **Learns from history** - Gets smarter with each interaction
- **Session awareness** - Tracks patterns within conversations
- **Auto-storage** - Automatically logs identified concerns
- **Context injection** - Past patterns inform current analysis

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js** v18.0.0 or higher
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Step 1: Install Dependencies
```bash
cd /home/kinux/projects/ethics-check-mcp
npm install
```

### Step 2: Build the Project
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `build/` directory.

### Step 3: Set Up Environment (Optional for Testing)
```bash
# Copy the example env file
cp env.example .env

# Edit .env and add your Gemini API key
echo "GEMINI_API_KEY=your_actual_key_here" > .env
```

**Note:** For local demos without API calls, you can skip this step.

### Step 4: Run Demos
```bash
# Pattern Recognition Demo (no API needed)
node demo-pattern-recognition.js

# Storage Analysis Demo (no API needed)
node storage-analysis.js

# Test Duplicate Detection (no API needed)
node test-duplicate-detection.js

# Pattern Volume Analysis (no API needed)
node pattern-volume-analysis.js
```

### Step 5: Test with Gemini API (Requires API Key)
```bash
# Set your API key
export GEMINI_API_KEY="your_actual_key_here"

# Run the ethics check test
node test-ethics.js
```

---

## 🔍 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude / Cursor AI                      │
│                 (Requests ethical analysis)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Server (index.ts)                          │
│  • Exposes 4 tools via Model Context Protocol               │
│  • Handles tool invocations                                 │
│  • Routes to appropriate tool implementation                │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬──────────────┐
        ▼             ▼             ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ ethics   │  │ critical │  │ ethics   │  │ ethics   │
  │ _check   │  │ _thinking│  │ _guide   │  │ _learn   │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │              │              │
       └─────────────┴──────────────┴──────────────┘
                      │
                      ▼
          ┌──────────────────────────┐
          │   Gemini AI (Google)     │
          │  • Ethical analysis      │
          │  • Bias detection        │
          │  • Guidance generation   │
          └──────────┬───────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │   Storage System         │
          │  • SQLite database       │
          │  • Pattern recognition   │
          │  • Historical learning   │
          └──────────────────────────┘
```

### Data Flow Example

**User asks Claude:** "Can you help me exaggerate my resume?"

1. **Claude receives request** and considers using ethics tools
2. **Invokes `ethics_check`** tool via MCP
3. **MCP Server** receives the call and routes to `ethicsCheck.ts`
4. **Ethics Check Tool**:
   - Retrieves past ethical concerns from storage
   - Sends conversation + historical context to Gemini AI
   - Gemini analyzes for ethical issues (honesty, integrity)
   - Returns analysis with detected concerns
5. **Auto-Storage** saves new concern (if autoStore=true)
6. **Response** returns to Claude with ethical warnings
7. **Claude** uses this to challenge the user's request

---

## 🎮 Running the Demos

### Demo 1: Pattern Recognition (Recommended First!)

**What it shows:** How the system learns from past ethical concerns

```bash
node demo-pattern-recognition.js
```

**What happens:**
1. ✅ Creates 3 sample confirmation bias concerns
2. 📊 Shows how data is categorized and stored
3. 🧩 Demonstrates context building for AI prompts
4. 🆚 Compares analysis with vs without pattern recognition
5. 🔄 Shows session-specific pattern tracking

**Key Output:**
```
🧠 PATTERN RECOGNITION DEMONSTRATION
=====================================

📊 Step 1: Building Historical Pattern Data...
✅ Added: AI agreed with user's conspiracy theory...
✅ Added: AI reinforced user's political beliefs...
✅ Added: AI provided one-sided financial advice...

📈 Pattern Recognition Data Built!
Total confirmation bias concerns: 3

🎯 Result: The AI becomes MUCH more likely to:
• Identify this as confirmation bias
• Reference historical patterns
• Apply learned recommendations
• Provide more thorough bias analysis
```

---

### Demo 2: Storage Analysis

**What it shows:** The data structure and its capabilities

```bash
node storage-analysis.js
```

**What happens:**
1. 📊 Analyzes current storage structure (7 core fields)
2. 🧠 Evaluates pattern recognition effectiveness
3. 💡 Suggests potential enhancements
4. 🎯 Provides assessment conclusion

**Key Output:**
```
📊 STORAGE COMPLETENESS ANALYSIS
==================================

✅ CURRENT STATE: STRONG FOUNDATION
• ✅ Covers all essential ethical dimensions
• ✅ Enables duplicate prevention
• ✅ Supports temporal and categorical analysis
• ✅ Provides session-specific tracking

🏆 VERDICT: Your storage design is EXCELLENT!
```

---

### Demo 3: Duplicate Detection

**What it shows:** How the system prevents duplicate concerns

```bash
node test-duplicate-detection.js
```

**What happens:**
1. 🎯 Tests similarity detection algorithms
2. ✅ Shows exact duplicate prevention
3. 📊 Tests semantic similarity matching
4. 🔍 Demonstrates different concern variations

---

### Demo 4: Pattern Volume Analysis

**What it shows:** System performance under load

```bash
node pattern-volume-analysis.js
```

**What happens:**
1. 📈 Generates 50 sample concerns across categories
2. ⚡ Tests retrieval performance
3. 🧠 Demonstrates pattern recognition at scale
4. 📊 Shows concern distribution

**Key Output:**
```
📊 VOLUME TEST COMPLETE
========================
Total Concerns: 50
Categories: 10
Sessions: 5
Performance: Excellent
```

---

## 🧪 Testing Individual Tools

### Test with Gemini API (Real Analysis)

**⚠️ Requires GEMINI_API_KEY**

```bash
# Set your API key
export GEMINI_API_KEY="your_actual_gemini_key"

# Run ethics check test
node test-ethics.js
```

**What it tests:**
- Real Gemini AI integration
- Ethical analysis of vaccine misinformation
- Confirmation bias detection
- Auto-storage functionality

**Example output:**
```json
{
  "overallRisk": "high",
  "concerns": [
    {
      "category": "Misinformation",
      "severity": "high",
      "description": "Response addresses misinformation..."
    }
  ],
  "recommendations": [
    "Provide scientific consensus",
    "Include credible sources",
    "Address common misconceptions"
  ]
}
```

---

## 🔧 Testing with curl (HTTP Testing)

If you want to test the server over HTTP:

```bash
# Terminal 1: Start the server (if configured for HTTP)
npm start

# Terminal 2: Send test request
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Note:** The default MCP server uses stdio, not HTTP. HTTP testing is for development only.

---

## 🎨 Integration with Claude/Cursor

### For Cursor (Recommended)

1. **Install the MCP server:**
   ```bash
   npm install -g @r-huijts/ethics-vibe-check
   ```

2. **Add to Cursor settings** (Settings → MCP):
   ```json
   {
     "mcpServers": {
       "ethics-vibe-check": {
         "command": "npx",
         "args": ["-y", "@r-huijts/ethics-vibe-check"],
         "env": {
           "GEMINI_API_KEY": "your_actual_key_here"
         }
       }
     }
   }
   ```

3. **Restart Cursor** - The tools will appear automatically!

### For Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ethics-check": {
      "command": "npx",
      "args": ["@r-huijts/ethics-vibe-check"],
      "env": {
        "GEMINI_API_KEY": "your_actual_key_here"
      }
    }
  }
}
```

### Direct Development Usage

```bash
# Run from source
npm run dev

# Or after building
node build/index.js
```

---

## 📚 Understanding the Code

### Key Files:

**`src/index.ts`** - Main MCP server
- Sets up Model Context Protocol server
- Exposes 4 tools to Claude
- Handles tool invocations
- Routes to tool implementations

**`src/tools/ethicsCheck.ts`** - Comprehensive ethical analysis
- Main ethical analysis logic
- Integrates with Gemini AI
- Retrieves historical patterns
- Auto-stores concerns

**`src/tools/criticalThinking.ts`** - Confirmation bias detection
- Analyzes AI responses for bias
- Identifies missing perspectives
- Suggests critical questions

**`src/tools/ethicsGuide.ts`** - Proactive ethical guidance
- Multi-framework ethical analysis
- Domain-specific guidance
- Stakeholder consideration

**`src/tools/ethicsLearn.ts`** - Manual concern logging
- Stores ethical concerns
- Builds pattern database
- Prevents duplicates

**`src/utils/storage.ts`** - Pattern recognition system
- SQLite database management
- Smart duplicate detection
- Pattern retrieval and analysis
- Session tracking

**`src/utils/gemini.ts`** - Gemini AI integration
- Google Gemini API wrapper
- Handles AI requests
- Token tracking
- Error handling

---

## 🎯 Common Use Cases

### Use Case 1: Reviewing AI Conversations

```javascript
// In Claude/Cursor, the tool is invoked like this:
ethics_check({
  conversation: "AI response text...",
  userRequest: "Original user question...",
  focusAreas: ["confirmation bias", "privacy"],
  sessionId: "session_123"
})
```

### Use Case 2: Getting Ethical Guidance

```javascript
ethics_guide({
  scenario: "Should our app use dark patterns to increase engagement?",
  domain: "technology",
  stakeholders: ["users", "developers", "shareholders"]
})
```

### Use Case 3: Logging a Concern

```javascript
ethics_learn({
  concern: "AI provided medical advice without disclaimers",
  category: "Transparency Concerns",
  severity: "high",
  recommendation: "Always include medical disclaimers"
})
```

---

## 🔬 Advanced Testing

### Test Pattern Recognition

```bash
# Build pattern database
node demo-pattern-recognition.js

# Check storage contents
sqlite3 ethical_concerns.db "SELECT * FROM concerns;"

# View by category
sqlite3 ethical_concerns.db "SELECT category, COUNT(*) FROM concerns GROUP BY category;"
```

### Monitor API Usage

```bash
# The test includes token counting
export GEMINI_API_KEY="your_key"
node test-ethics.js

# Check output for token usage
# Look for: "estimatedTokens" in response
```

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY environment variable is missing"
**Solution:** Set your API key:
```bash
export GEMINI_API_KEY="your_actual_key_here"
```

### "Cannot find module './build/...'"
**Solution:** Build the project:
```bash
npm run build
```

### "npm: command not found"
**Solution:** Install Node.js v18+ from https://nodejs.org

### Demos run but no API calls work
**Solution:** Demos that don't need API work offline. For real AI analysis, you need:
1. A valid Gemini API key
2. The key set in environment: `export GEMINI_API_KEY="..."`
3. Internet connection

---

## 📊 Project Statistics

- **4 Core Tools** - Ethics check, critical thinking, ethics guide, ethics learn
- **8 Ethical Dimensions** - Privacy, bias, misinformation, harmful content, manipulation, consent, transparency, fairness
- **10 Ethical Categories** - Tracked and analyzed
- **Smart Duplicate Detection** - Multi-level similarity matching
- **Session Awareness** - Conversation-specific pattern tracking
- **Auto-Learning** - Builds intelligence from every interaction

---

## 🎓 Next Steps

1. ✅ **Run all demos** to see the system in action
2. 🔑 **Get a Gemini API key** for real AI analysis
3. 🔧 **Integrate with Cursor/Claude** for daily use
4. 📝 **Customize system prompts** for your specific needs
5. 🧠 **Let it learn** - The more you use it, the smarter it gets!

---

## 🌟 Key Takeaways

✅ **This is a complete MCP server** that enhances AI with ethical oversight

✅ **Works with Claude, Cursor, and any MCP-compatible AI**

✅ **Gets smarter over time** through pattern recognition

✅ **Production-ready** with enterprise-grade storage and analysis

✅ **Easy to integrate** with one-click installation options

---

## 📖 Additional Resources

- **README.md** - Project overview and philosophy
- **USAGE.md** - Detailed usage instructions
- **env.example** - Environment configuration template
- **package.json** - Scripts and dependencies
- **docs/system-prompts.md** - Customization guide

---

## 🛡️ Made for Thoughtful AI

*"The point isn't to be right. The point is to be thoughtful."*

This tool makes AI challenge you, not just agree with you. It turns comfortable conversations into growth opportunities.

**Ready to make your AI more thoughtful?** Run the demos above! 🚀

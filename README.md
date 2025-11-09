# Voice-Controlled API Management System

**Transform any Next.js application into a voice-enabled interface—automatically.**

At Hiya, you're revolutionizing voice communication by making it more secure, productive, and intelligent. This project demonstrates how voice can become the primary interface for managing complex systems, bringing natural language control to any API-powered application.

## What This Is

A universal tool-creation system that automatically discovers your Next.js API routes, extracts their functionality from docstrings, and creates an intelligent voice agent capable of controlling your entire application through natural conversation. No manual tool definitions, no complex integrations—just point it at your Next.js project and start talking.

## Why This Matters

Voice interfaces are the future of human-computer interaction, especially in mission-critical environments like call centers where hands-free operation and rapid response are essential. This system proves that voice control can be:

- **Universal**: Works with any Next.js app, not just call centers
- **Automatic**: Discovers and understands your API without manual configuration
- **Intelligent**: Uses AI to understand context and intent from natural language
- **Production-Ready**: Built on Mastra, designed for real-world applications

## The Demo: Hiya Manager Call Center Dashboard

This project demonstrates the system by voice-enabling the Hiya Manager call center dashboard I built for the Innovation Challenge. Using natural voice commands, you can:

- **Monitor Operations**: "What's the status of the call center?" or "Show me the current metrics"
- **Manage Agents**: "Create a new agent" or "How many agents are active?"
- **Handle Calls**: "Create a new call" or "Reassign call CALL-123 to another agent"
- **Respond to Situations**: "Signal agent to close their call if it's getting worse"
- **Analyze Data**: "Show me the forecast" or "What incidents have occurred?"

All of this works through natural conversation—no memorizing commands or navigating complex UIs.

## How It Works

1. **Discovery**: The system traverses your Next.js project, scanning API routes
2. **Extraction**: It reads TSDoc comments from your route handlers to understand what each endpoint does
3. **Tool Generation**: Creates OpenAI-compatible tools for each discovered endpoint
4. **Agent Creation**: Builds a Mastra Agent with a context-aware system prompt generated from your project structure
5. **Voice Interface**: Enables natural language interaction through Mastra Studio

The result? Your entire API becomes voice-controllable with zero manual configuration.

## Technical Highlights

- **Automatic API Discovery**: Scans Next.js routes recursively
- **Intelligent Documentation Parsing**: Extracts function signatures, parameters, and descriptions from TSDoc
- **Context-Aware Prompts**: Generates system prompts that understand your application's domain
- **OpenAI-Compatible Tools**: Works with any LLM that supports function calling
- **Type-Safe**: Full TypeScript support with proper type inference

## Getting Started

### Prerequisites

- Node.js installed
- Both `hiyamanager` and `hiyavoice` projects cloned

### Running the Demo

1. **Start the Hiya Manager Dashboard**:
   ```bash
   cd hiyamanager && npm run dev
   ```

2. **Start the Voice Control System**:
   ```bash
   cd hiyavoice && npm run dev
   ```

3. **Open Mastra Studio** in your browser to interact with the voice agent

4. **(Optional) Monitor the Dashboard** by opening it in a separate browser tab to see real-time updates as you control it with your voice

## The Vision

This proof of concept shows how voice interfaces can transform software interaction. Imagine call center supervisors managing operations hands-free, developers controlling their APIs through conversation, testing their APIs with voice, or any user interacting with complex systems using the most natural interface: their voice.

The future of AI interaction is voice, this solution attempts to solve the compatibility issues and adoption issues with MCP.

At Hiya, you understand that voice is more than just audio—it's the future of how humans will interact with technology. This project demonstrates that future, today.

---

**Built for the Hiya Innovation Challenge** | Demonstrating the power of voice-enabled APIs

---
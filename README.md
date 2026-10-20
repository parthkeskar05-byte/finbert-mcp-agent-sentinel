# FinBERT & MCP Agent Sentinel

An enterprise-grade financial NLP pipeline and Model Context Protocol (MCP) tool server that ingests live Yahoo Finance RSS streams asynchronously, classifies sentiment using Hugging Face FinBERT, and enforces self-reflection QA grounding to eliminate hallucinations.

## Architecture
- **Research Sub-Agent**: Headless asynchronous XML/RSS financial stream parser.
- **Finance Sub-Agent**: FinBERT directional sentiment classification with explicit confidence scoring.
- **Editor & Self-Reflection Agent**: QA hallucination verification loop with SQLite audit logging.

## Tech Stack
Python, FastAPI, Uvicorn, Hugging Face Transformers (FinBERT), SQLite, React, TypeScript, Tailwind CSS.

## Verification & Benchmarks
- Pinned to reproducible MLOps telemetry and tested with Vitest.
- Conforms to Everything-as-Code (ECC) rigorous input boundary validation and immutable state contracts.
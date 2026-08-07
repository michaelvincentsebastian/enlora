import CapabilityStub from '../components/CapabilityStub'

export default function AI() {
  return (
    <CapabilityStub
      icon="🤖"
      title="AI Assistant"
      tagline="SQL generation · Pipeline builder · Schema recommender · Explanation"
      color="var(--cap-ai)"
      phase="Phase 3"
      description="A context-aware AI assistant embedded throughout Enlora. Ask questions about your
        data in natural language, generate SQL queries, auto-build pipelines from a description,
        or get plain-English explanations of complex transformations. Runs on your own LLM or cloud APIs."
      features={[
        'Natural-language → SQL over DuckLake tables',
        'Pipeline auto-builder: describe a transformation, get a SQLMesh model',
        'Schema recommender: suggest optimal column types from data samples',
        'Anomaly explanation: why did this metric spike?',
        'Data quality rule generator from column statistics',
        'Privacy-first: runs on local LLMs (Ollama, LM Studio) or cloud APIs',
      ]}
      technologies={['LangChain', 'LlamaIndex', 'Ollama', 'OpenAI', 'Gemini', 'RAG', 'DuckDB']}
      exampleCode={`# Future AIService interface
result = AIService.ask(
  "Show me the top 5 sources by total file size "
  "uploaded in the last 7 days"
)
# → Generates & executes DuckDB SQL
# → Returns result + explanation in plain English

pipeline = AIService.build_pipeline(
  "Join file_metadata with sales data and "
  "aggregate by week"
)`}
    />
  )
}

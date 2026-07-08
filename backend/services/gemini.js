const { GoogleGenAI } = require('@google/genai');

let ai = null;

function getAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function askGemini(prompt) {
  const client = getAI();
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });
  return response.text;
}

const PROMPTS = {
  explain: (code, language = '') => {
    return `You are a senior developer. Explain the following ${language} code clearly and concisely. 
Break down what each part does, mention any patterns used, and note potential issues.

\`\`\`${language}
${code}
\`\`\`

Provide a clear, structured explanation.`;
  },

  debug: (code, error = '', language = '') => {
    return `You are a debugging expert. Analyze this ${language} code and find bugs.
${error ? `The user reports this error: ${error}` : 'Find all potential bugs and issues.'}

\`\`\`${language}
${code}
\`\`\`

For each issue found:
1. Identify the problem
2. Explain why it happens
3. Provide the fix with corrected code`;
  },

  generateTests: (code, language = '') => {
    return `You are a testing expert. Generate comprehensive unit tests for this ${language} code.

\`\`\`${language}
${code}
\`\`\`

Generate tests that cover:
- Normal cases
- Edge cases
- Error handling
Use the appropriate testing framework for ${language || 'the language'}.`;
  },

  optimize: (code, language = '') => {
    return `You are a performance optimization expert. Optimize this ${language} code for better performance.

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Optimized version of the code
2. Explanation of each optimization
3. Expected performance improvement`;
  },

  refactor: (code, language = '') => {
    return `You are a code quality expert. Refactor this ${language} code for better readability, maintainability, and following best practices.

\`\`\`${language}
${code}
\`\`\`

Provide the refactored code with explanations for each change.`;
  },

  review: (code, language = '') => {
    return `You are a senior code reviewer. Review this ${language} code thoroughly.

\`\`\`${language}
${code}
\`\`\`

Review for:
- Code quality and readability
- Potential bugs
- Security vulnerabilities
- Performance issues
- Best practice violations

Rate the code quality (1-10) and provide actionable feedback.`;
  },

  document: (code, language = '') => {
    return `You are a documentation expert. Generate comprehensive documentation for this ${language} code.

\`\`\`${language}
${code}
\`\`\`

Generate:
- JSDoc/docstring comments for all functions
- Parameter descriptions
- Return value descriptions
- Usage examples
Return the fully documented code.`;
  },

  flowchart: (code, language = '') => {
    return `You are a software architect. Analyze this ${language} code and generate a clean, detailed Mermaid.js flowchart explaining its execution logic.
Your output MUST be ONLY valid Mermaid.js code starting with "graph TD" or "flowchart TD". 
Do not wrap the Mermaid code in backticks or include any introductory/concluding text. Simply return the raw Mermaid syntax.

Code:
${code}`;
  },

  ragQuery: (question, context) => {
    return `You are an AI assistant for a coding project called CodeCollab.
Answer the user's question using ONLY the project code provided below.
If the code context doesn't contain enough information, say so honestly.

--- PROJECT CODE ---
${context}
--- END PROJECT CODE ---

User Question: ${question}

Answer based on the actual project code above:`;
  }
};

module.exports = { askGemini, PROMPTS, getAI };

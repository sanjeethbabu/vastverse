# Mr. Smart

Mr. Smart is the website assistant's isolated LangGraph workflow. The `analyze`
node identifies whether a visitor's latest question concerns technology,
finance, both, or general topics. The `answer` node passes the conversation and
that focus to the existing server-side xAI client in `app.consultant`.

The workflow does not use external tools or execute code. Configure `XAI_API_KEY`
and optionally `XAI_MODEL` in the backend environment; credentials remain on the
server. Finance answers are educational and cannot replace individualized advice
from a qualified financial, tax, or legal professional.

The FastAPI endpoints `/api/mr-smart/chat` and the backwards-compatible
`/api/chat` both invoke this graph.

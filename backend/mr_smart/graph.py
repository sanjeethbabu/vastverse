"""Mr. Smart's lightweight LangGraph analysis and response workflow."""
import re
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app import consultant


class MrSmartState(TypedDict):
    messages: list[dict[str, str]]
    focus: str
    response: str


FINANCE_TERMS = {
    "accounting", "budget", "cash flow", "debt", "finance", "financial",
    "invest", "investment", "loan", "market", "money", "portfolio", "profit",
    "revenue", "stock", "tax", "valuation",
}
TECH_TERMS = {
    "ai", "app", "architecture", "automation", "cloud", "code", "cybersecurity",
    "data", "database", "developer", "digital", "machine learning", "mobile",
    "programming", "saas", "security", "software", "technology", "website",
}


def _analyze(state: MrSmartState) -> dict[str, str]:
    query = state["messages"][-1]["content"].casefold()
    def mentions(terms: set[str]) -> bool:
        return any(
            term in query if " " in term else re.search(rf"\b{re.escape(term)}\b", query)
            for term in terms
        )

    finance = mentions(FINANCE_TERMS)
    technology = mentions(TECH_TERMS)
    focus = "technology and finance" if finance and technology else (
        "finance" if finance else "technology" if technology else "general"
    )
    return {"focus": focus}


def _answer(state: MrSmartState) -> dict[str, str]:
    return {"response": consultant.reply(state["messages"], focus=state["focus"])}


workflow = StateGraph(MrSmartState)
workflow.add_node("analyze", _analyze)
workflow.add_node("answer", _answer)
workflow.add_edge(START, "analyze")
workflow.add_edge("analyze", "answer")
workflow.add_edge("answer", END)
mr_smart_graph = workflow.compile()


def reply(messages: list[dict[str, str]]) -> str:
    result = mr_smart_graph.invoke({"messages": messages, "focus": "general", "response": ""})
    return result["response"]

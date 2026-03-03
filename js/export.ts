// ─── EXPORT.TS — AgentSpark Framework Export ─────────────
// Fixed: TS2339 Exporter property errors, TS7006 implicit any params,
//        TS7034/7005 tasks array, TS2304 appAlert

// ─── Exporter interface ───────────────────────────────────
interface IExporter {
  toCrewAI:    (agents: any[]) => string;
  toLangGraph: (agents: any[]) => string;
  download:    (filename: string, content: string) => void;
}

const Exporter: IExporter = {
  toCrewAI:    () => '',
  toLangGraph: () => '',
  download:    () => {},
};

// ─── Helper functions ─────────────────────────────────────
function extractSection(md: string, sectionName: string): string {
  if (!md) return '';
  const regex = new RegExp(
    `(?:##|\\*\\*)\\s*${sectionName}(?::|\\s)\\s*([\\s\\S]*?)(?=(?:\\n(?:##|\\*\\*)|\$))`,
    'i'
  );
  const match = md.match(regex);
  return match ? match[1].trim() : '';
}

function cleanStr(str: string): string {
  if (!str) return '';
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function pythonStr(str: string): string {
  if (!str) return '""';
  if (str.includes('\n')) {
    return `"""${str.replace(/"""/g, '\\"\\"\\"')}"""`;
  }
  return `"${str.replace(/"/g, '\\"')}"`;
}

function sanitizeVarName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
}

// ─── CrewAI Export ────────────────────────────────────────
Exporter.toCrewAI = function (agents: any[]): string {
  let pythonCode = `from crewai import Agent, Task, Crew, Process
import os

# Ensure you have OPENAI_API_KEY set in your environment
# os.environ["OPENAI_API_KEY"] = "sk-..."

`;

  pythonCode += `# --- Agents ---\n`;
  agents.forEach((agent: any) => {
    const varName = sanitizeVarName(agent.name) + '_agent';

    let goal = extractSection(agent.agentMd, 'Goal');
    if (!goal) goal = agent.description || 'Complete assigned tasks effectively.';

    let backstory = extractSection(agent.agentMd, 'Backstory');
    if (!backstory) backstory = extractSection(agent.agentMd, 'Context');
    if (!backstory) backstory = extractSection(agent.agentMd, 'Personality');
    if (!backstory) backstory = agent.description || 'An AI agent specialized in this role.';

    pythonCode += `${varName} = Agent(
    role=${pythonStr(agent.role || agent.name)},
    goal=${pythonStr(goal)},
    backstory=${pythonStr(backstory)},
    verbose=True,
    allow_delegation=${agent.type === 'technical' ? 'False' : 'True'}
)

`;
  });

  pythonCode += `# --- Tasks ---\n`;
  const tasks: string[] = [];
  agents.forEach((agent: any) => {
    const agentVar = sanitizeVarName(agent.name) + '_agent';
    const taskVar  = sanitizeVarName(agent.name) + '_task';
    tasks.push(taskVar);

    const description = `Execute the responsibilities of ${agent.role || agent.name}. Analyze the topic and provide insights.`;

    pythonCode += `${taskVar} = Task(
    description=${pythonStr(description)},
    expected_output=${pythonStr('A detailed report or code based on the task description.')},
    agent=${agentVar}
)

`;
  });

  pythonCode += `# --- Crew ---\n`;
  pythonCode += `crew = Crew(
    agents=[${agents.map((a: any) => sanitizeVarName(a.name) + '_agent').join(', ')}],
    tasks=[${tasks.join(', ')}],
    process=Process.sequential,
    verbose=True
)

`;
  pythonCode += `result = crew.kickoff()\nprint(result)\n`;
  return pythonCode;
};

// ─── LangGraph Export ─────────────────────────────────────
Exporter.toLangGraph = function (agents: any[]): string {
  let pythonCode = `from typing import Dict, TypedDict, Annotated, List, Union
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import operator

# Define Agent State
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    next: str

# LLM Setup
llm = ChatOpenAI(model="gpt-4o")

`;

  pythonCode += `# --- Agent Nodes ---\n`;
  agents.forEach((agent: any) => {
    const nodeName = sanitizeVarName(agent.name);

    let systemPrompt = `You are ${agent.name}, a ${agent.role || 'specialist'}.\n`;
    const goal = extractSection(agent.agentMd, 'Goal');
    if (goal) systemPrompt += `Your Goal: ${goal}\n`;
    let backstory = extractSection(agent.agentMd, 'Backstory');
    if (!backstory) backstory = extractSection(agent.agentMd, 'Context');
    if (backstory) systemPrompt += `Backstory: ${backstory}\n`;

    pythonCode += `def ${nodeName}_node(state: AgentState):
    messages = state['messages']
    response = llm.invoke(
        [{"role": "system", "content": ${pythonStr(systemPrompt)}}] + messages
    )
    return {"messages": [response]}

`;
  });

  pythonCode += `# --- Graph Construction ---\n`;
  pythonCode += `workflow = StateGraph(AgentState)\n\n`;

  agents.forEach((agent: any) => {
    const nodeName = sanitizeVarName(agent.name);
    pythonCode += `workflow.add_node("${nodeName}", ${nodeName}_node)\n`;
  });

  pythonCode += `\n# Define Edges (Sequential)\n`;
  if (agents.length > 0) {
    pythonCode += `workflow.set_entry_point("${sanitizeVarName(agents[0].name)}")\n`;
    for (let i = 0; i < agents.length - 1; i++) {
      const current = sanitizeVarName(agents[i].name);
      const next    = sanitizeVarName(agents[i + 1].name);
      pythonCode += `workflow.add_edge("${current}", "${next}")\n`;
    }
    pythonCode += `workflow.add_edge("${sanitizeVarName(agents[agents.length - 1].name)}", END)\n`;
  }

  pythonCode += `\n# Compile\napp = workflow.compile()\n\n# Run\ninputs = {"messages": [HumanMessage(content="Start the project.")]}\nfor output in app.stream(inputs):\n    for key, value in output.items():\n        print(f"Output from node '{key}':")\n        print("---")\n        print(value)\n        print("\\n---\\n")\n`;
  return pythonCode;
};

// ─── Download helper ──────────────────────────────────────
Exporter.download = function (filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

// ─── Window export ────────────────────────────────────────
window.Exporter = Exporter;

// ─── UI Logic ─────────────────────────────────────────────
// appAlert may not exist in all environments — use window.appAlert with fallback
function _alert(msg: string, title?: string): void {
  if (typeof window.appAlert === 'function') {
    window.appAlert(msg, title);
  } else {
    alert(title ? `${title}\n\n${msg}` : msg);
  }
}

window.openExportCodeModal = function (): void {
  if (typeof window.isPro !== 'undefined' && !window.isPro) {
    if (typeof window.showPaywall === 'function') {
      window.showPaywall();
    } else {
      _alert('This feature is locked for Pro users.', 'Pro Feature');
    }
    return;
  }
  if (!window.generatedAgents || window.generatedAgents.length === 0) {
    _alert('No agents generated yet.', 'Export Unavailable');
    return;
  }
  const modal = document.getElementById('export-code-modal') as HTMLElement | null;
  if (modal) modal.classList.add('open');
};

window.closeExportCodeModal = function (): void {
  const modal = document.getElementById('export-code-modal') as HTMLElement | null;
  if (modal) modal.classList.remove('open');
};

window.exportCode = function (framework: string): void {
  if (!window.generatedAgents || window.generatedAgents.length === 0) {
    _alert('No agents generated yet.', 'Export Unavailable');
    return;
  }
  let code = '';
  if (framework === 'crewai') {
    code = Exporter.toCrewAI(window.generatedAgents);
  } else if (framework === 'langgraph') {
    code = Exporter.toLangGraph(window.generatedAgents);
  }
  Exporter.download(`agents_${framework}.py`, code);
  if (typeof window.closeExportCodeModal === 'function') window.closeExportCodeModal();
};

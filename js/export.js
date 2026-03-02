// js/export.js

const Exporter = {};

// --- Helper Functions ---

function extractSection(md, sectionName) {
  if (!md) return '';
  // Match ## Section Name or **Section Name:**
  // Case insensitive
  // Capture content until next ## or ** or end of string
  const regex = new RegExp(`(?:##|\\*\\*)\\s*${sectionName}(?::|\\s)\\s*([\\s\\S]*?)(?=(?:\\n(?:##|\\*\\*)|\$))`, 'i');
  const match = md.match(regex);
  return match ? match[1].trim() : '';
}

function cleanStr(str) {
  if (!str) return '';
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function pythonStr(str) {
    if (!str) return '""';
    if (str.includes('\n')) {
        return `"""${str.replace(/"""/g, '\\"\\"\\"')}"""`;
    }
    return `"${str.replace(/"/g, '\\"')}"`;
}

function sanitizeVarName(name) {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
}


// --- CrewAI Export ---

Exporter.toCrewAI = function(agents) {
    let pythonCode = `from crewai import Agent, Task, Crew, Process
import os

# Ensure you have OPENAI_API_KEY set in your environment
# os.environ["OPENAI_API_KEY"] = "sk-..."

`;

    // 1. Agents
    pythonCode += `# --- Agents ---\n`;
    agents.forEach(agent => {
        const varName = sanitizeVarName(agent.name) + "_agent";
        
        let goal = extractSection(agent.agentMd, "Goal");
        if (!goal) goal = agent.description || "Complete assigned tasks effectively.";
        
        let backstory = extractSection(agent.agentMd, "Backstory");
        if (!backstory) backstory = extractSection(agent.agentMd, "Context");
        if (!backstory) backstory = extractSection(agent.agentMd, "Personality");
        if (!backstory) backstory = agent.description || "An AI agent specialized in this role.";

        pythonCode += `${varName} = Agent(
    role=${pythonStr(agent.role || agent.name)},
    goal=${pythonStr(goal)},
    backstory=${pythonStr(backstory)},
    verbose=True,
    allow_delegation=${agent.type === 'technical' ? 'False' : 'True'}
)

`;
    });

    // 2. Tasks
    pythonCode += `# --- Tasks ---\n`;
    const tasks = [];
    agents.forEach(agent => {
        const agentVar = sanitizeVarName(agent.name) + "_agent";
        const taskVar = sanitizeVarName(agent.name) + "_task";
        tasks.push(taskVar);
        
        const description = `Execute the responsibilities of ${agent.role || agent.name}. Analyze the topic and provide insights.`;
        
        pythonCode += `${taskVar} = Task(
    description=${pythonStr(description)},
    expected_output=${pythonStr("A detailed report or code based on the task description.")},
    agent=${agentVar}
)

`;
    });

    // 3. Crew
    pythonCode += `# --- Crew ---\n`;
    pythonCode += `crew = Crew(
    agents=[${agents.map(a => sanitizeVarName(a.name) + "_agent").join(', ')}],
    tasks=[${tasks.join(', ')}],
    process=Process.sequential,
    verbose=True
)

`;
    
    pythonCode += `result = crew.kickoff()
print(result)
`;

    return pythonCode;
};


// --- LangGraph Export ---

Exporter.toLangGraph = function(agents) {
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

    // Nodes
    pythonCode += `# --- Agent Nodes ---\n`;
    
    agents.forEach(agent => {
        const nodeName = sanitizeVarName(agent.name);
        
        let systemPrompt = `You are ${agent.name}, a ${agent.role || "specialist"}.\n`;
        let goal = extractSection(agent.agentMd, "Goal");
        if (goal) systemPrompt += `Your Goal: ${goal}\n`;
        
        let backstory = extractSection(agent.agentMd, "Backstory");
        if (!backstory) backstory = extractSection(agent.agentMd, "Context");
        if (backstory) systemPrompt += `Backstory: ${backstory}\n`;

        pythonCode += `def ${nodeName}_node(state: AgentState):
    messages = state['messages']
    # Simple invocation - in a real app, bind tools or use system prompt
    response = llm.invoke(
        [{"role": "system", "content": ${pythonStr(systemPrompt)}}] + messages
    )
    return {"messages": [response]}

`;
    });

    // Graph Construction
    pythonCode += `# --- Graph Construction ---\n`;
    pythonCode += `workflow = StateGraph(AgentState)\n\n`;
    
    agents.forEach(agent => {
        const nodeName = sanitizeVarName(agent.name);
        pythonCode += `workflow.add_node("${nodeName}", ${nodeName}_node)\n`;
    });

    pythonCode += `\n# Define Edges (Sequential for simplicity)\n`;
    
    if (agents.length > 0) {
        pythonCode += `workflow.set_entry_point("${sanitizeVarName(agents[0].name)}")\n`;
        
        for (let i = 0; i < agents.length - 1; i++) {
            const current = sanitizeVarName(agents[i].name);
            const next = sanitizeVarName(agents[i+1].name);
            pythonCode += `workflow.add_edge("${current}", "${next}")\n`;
        }
        
        pythonCode += `workflow.add_edge("${sanitizeVarName(agents[agents.length-1].name)}", END)\n`;
    }

    pythonCode += `\n# Compile
app = workflow.compile()

# Run
inputs = {"messages": [HumanMessage(content="Start the project.")]}
for output in app.stream(inputs):
    for key, value in output.items():
        print(f"Output from node '{key}':")
        print("---")
        print(value)
        print("\\n---\\n")
`;

    return pythonCode;
};


// --- Helper: Download ---

Exporter.download = function(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); // Append to body to ensure click works in some browsers
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

// Expose to window
window.Exporter = Exporter;

// --- UI Logic (Modal Handling) ---

window.openExportCodeModal = function() {
    // Check if Pro (optional logic based on existing code)
    if (typeof window.isPro !== 'undefined' && !window.isPro) {
        if (typeof showPaywall === 'function') {
            showPaywall();
        } else {
            alert("This feature is locked for Pro users.");
        }
        return;
    }
    
    if (!window.generatedAgents || window.generatedAgents.length === 0) {
        alert("No agents generated yet.");
        return;
    }

    const modal = document.getElementById('export-code-modal');
    if (modal) modal.classList.add('open');
};

window.closeExportCodeModal = function() {
    const modal = document.getElementById('export-code-modal');
    if (modal) modal.classList.remove('open');
};

window.exportCode = function(framework) {
    if (!window.generatedAgents || window.generatedAgents.length === 0) {
        alert("No agents generated yet.");
        return;
    }
    
    let code = "";
    if (framework === 'crewai') {
        code = Exporter.toCrewAI(window.generatedAgents);
    } else if (framework === 'langgraph') {
        code = Exporter.toLangGraph(window.generatedAgents);
    }
    
    Exporter.download(`agents_${framework}.py`, code);
    window.closeExportCodeModal();
};

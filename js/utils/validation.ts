
interface AgentSparkWindow extends Window {
    validateProjectSchema: (project: any) => boolean;
}
declare let window: AgentSparkWindow;

export function validateProjectSchema(project: any): boolean {
    if (!project) return false;
    if (typeof project !== 'object') return false;
    if (project.v !== 3) return false;
    if (!Array.isArray(project.agents)) return false;
    return true;
}

window.validateProjectSchema = validateProjectSchema;

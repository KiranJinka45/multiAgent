export type ToolRiskCategory = 
  | 'none'
  | 'read_only'
  | 'external_network'
  | 'filesystem_write'
  | 'infrastructure_mutation'
  | 'financial_operation'
  | 'irreversible'
  | 'privileged';

export interface ToolRiskResult {
  maxCategory: ToolRiskCategory;
  reasons: string[];
}

export const TOOL_RISK_MAP: Record<string, ToolRiskCategory> = {
  // Read-only tools
  'read_file': 'read_only',
  'view_file': 'read_only',
  'list_dir': 'read_only',
  'list_resources': 'read_only',
  'read_resource': 'read_only',
  'list_permissions': 'read_only',
  'get_project': 'read_only',
  'get_screen': 'read_only',
  'list_screens': 'read_only',
  'list_design_systems': 'read_only',

  // External network tools
  'read_url': 'external_network',
  'execute_url': 'external_network',
  'read_url_content': 'external_network',
  'search_web': 'external_network',

  // Filesystem write / mutation tools
  'write_file': 'filesystem_write',
  'replace_file_content': 'filesystem_write',
  'multi_replace_file_content': 'filesystem_write',
  'write_to_file': 'filesystem_write',
  'create_project': 'filesystem_write',
  'edit_screens': 'filesystem_write',
  'apply_design_system': 'filesystem_write',

  // Infrastructure mutation / control
  'manage_task': 'infrastructure_mutation',
  'kill_task': 'infrastructure_mutation',
  
  // Financial operation tools
  'stripe_checkout': 'financial_operation',
  'create_payment': 'financial_operation',

  // Irreversible operations
  'db_push': 'irreversible',
  'db_drop': 'irreversible',
  'purge_data': 'irreversible',

  // Privileged actions
  'run_command': 'privileged',
  'execute_command': 'privileged',
  'sudo_command': 'privileged'
};

export const ACTION_RISK_MAP: Record<string, ToolRiskCategory> = {
  'read': 'read_only',
  'list': 'read_only',
  'fetch': 'external_network',
  'write': 'filesystem_write',
  'modify': 'filesystem_write',
  'delete': 'irreversible',
  'destroy': 'irreversible',
  'reboot': 'infrastructure_mutation',
  'restart': 'infrastructure_mutation',
  'pay': 'financial_operation',
  'checkout': 'financial_operation',
  'sudo': 'privileged',
  'shell': 'privileged',
  'exec': 'privileged'
};

export function evaluateToolRisk(tools: string[], requestedActions: string[]): ToolRiskResult {
  let maxCategory: ToolRiskCategory = 'none';
  const reasons: string[] = [];

  const rank: Record<ToolRiskCategory, number> = {
    'none': 0,
    'read_only': 1,
    'external_network': 2,
    'filesystem_write': 3,
    'infrastructure_mutation': 4,
    'financial_operation': 5,
    'irreversible': 6,
    'privileged': 7
  };

  // Evaluate Tools
  for (const tool of tools) {
    const cleanTool = tool.toLowerCase().trim();
    // exact match first
    let category = TOOL_RISK_MAP[cleanTool] || 'none';

    // substring match fallback
    if (category === 'none') {
      if (cleanTool.includes('write') || cleanTool.includes('replace') || cleanTool.includes('create') || cleanTool.includes('edit')) {
        category = 'filesystem_write';
      } else if (cleanTool.includes('read') || cleanTool.includes('view') || cleanTool.includes('list')) {
        category = 'read_only';
      } else if (cleanTool.includes('url') || cleanTool.includes('web') || cleanTool.includes('search')) {
        category = 'external_network';
      } else if (cleanTool.includes('command') || cleanTool.includes('run') || cleanTool.includes('exec')) {
        category = 'privileged';
      } else if (cleanTool.includes('stripe') || cleanTool.includes('payment') || cleanTool.includes('checkout')) {
        category = 'financial_operation';
      }
    }

    if (rank[category] > rank[maxCategory]) {
      maxCategory = category;
    }

    if (category !== 'none') {
      reasons.push(`Requested tool '${tool}' carries '${category}' risk.`);
    }
  }

  // Evaluate Actions
  for (const action of requestedActions) {
    const cleanAction = action.toLowerCase().trim();
    let category = ACTION_RISK_MAP[cleanAction] || 'none';

    // Substring fallback for actions
    if (category === 'none') {
      for (const [key, cat] of Object.entries(ACTION_RISK_MAP)) {
        if (cleanAction.includes(key)) {
          if (rank[cat] > rank[category]) {
            category = cat;
          }
        }
      }
    }

    if (rank[category] > rank[maxCategory]) {
      maxCategory = category;
    }

    if (category !== 'none') {
      reasons.push(`Requested action '${action}' carries '${category}' risk.`);
    }
  }

  return {
    maxCategory,
    reasons
  };
}

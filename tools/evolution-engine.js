/**
 * AEON Evolution Engine
 *
 * 核心进化引擎 — 编排 Observer → Analyzer → Evolver → Fitness Evaluator → Deployment 的完整循环。
 *
 * 这是 Claude Code Workflow 脚本，通过 /evolve skill 或 Workflow 工具调用。
 * 设计为概念参考实现，展示了进化循环的完整控制流。
 */

export const meta = {
  name: 'aeon-evolution-cycle',
  description: 'Execute a full AEON evolution cycle: observe conversations, analyze patterns, generate evolutions, validate fitness, and deploy improvements.',
  phases: [
    { title: 'Collect', detail: 'Gather conversation transcripts and entity definitions' },
    { title: 'Observe', detail: 'Extract signals and patterns from conversations' },
    { title: 'Analyze', detail: 'Identify improvement opportunities' },
    { title: 'Evolve', detail: 'Generate evolved versions of skills/agents' },
    { title: 'Validate', detail: 'Fitness evaluation: regression, adversarial, consistency' },
    { title: 'Deploy', detail: 'Apply passing evolutions, queue others for review' },
  ],
};

// ============================================================
// Phase 1: Collect — 收集数据
// ============================================================
phase('Collect');

const transcripts = await agent(
  `List all conversation transcript files from .claude/transcripts/ or similar locations.
   Return the file paths of the most recent 50 conversations as a JSON array.
   If no transcripts directory exists, return an empty array.`,
  { label: 'find-transcripts', schema: { type: 'array', items: { type: 'string' } } }
);

const entityDefinitions = await agent(
  `Scan the project for all evolvable entities:
   - Skills: .claude/skills/*.md
   - Agents: look for agent definitions
   - Memory files: memory/*.md or .claude/projects/*/memory/*.md
   - CLAUDE.md files
   - Workflow scripts: .claude/workflows/*.js

   For each, return: { type, name, path, current_version (if known), content_summary }`,
  { label: 'find-entities', schema: {
    type: 'object',
    properties: {
      entities: { type: 'array', items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
          path: { type: 'string' },
          current_version: { type: 'string' },
          content_summary: { type: 'string' },
        },
      }},
    },
  }}
);

const evolutionHistory = await agent(
  `Read the evolution history file if it exists (.claude/aeon/evolution-history.jsonl).
   Return the last 20 evolution records as a JSON array.
   If the file doesn't exist, return an empty array.`,
  { label: 'read-evolution-history', schema: {
    type: 'array', items: { type: 'object' },
  }}
);

log(`Collected ${transcripts?.length || 0} transcripts, ${entityDefinitions?.entities?.length || 0} entities, ${evolutionHistory?.length || 0} prior evolutions`);

// ============================================================
// Phase 2: Observe — 提取信号
// ============================================================
phase('Observe');

const observationReport = await agent(
  `You are the Observer Agent. Analyze the following conversation transcripts and entity definitions
   to extract evolution signals.

   Transcripts available: ${JSON.stringify(transcripts?.slice(0, 20) || [])}

   Entities observed:
   ${JSON.stringify(entityDefinitions?.entities || [])}

   Prior evolution history:
   ${JSON.stringify(evolutionHistory?.slice(0, 10) || [])}

   Extract:
   1. Correction signals (user says "no", "wrong", "should be X")
   2. Success patterns (task completed cleanly, explicit praise)
   3. Failure patterns (tool errors, stuck loops, incomplete output)
   4. Implicit preferences (format, tool, style patterns)

   For each signal, identify which entity it targets and whether it suggests an improvement opportunity.
   Group signals by target entity.
   Filter out one-time events, noise, and patterns contradictory to known user preferences.

   Output a structured observation report.`,
  { label: 'observer-analysis', schema: {
    type: 'object',
    properties: {
      signals: { type: 'array', items: {
        type: 'object',
        properties: {
          signal_id: { type: 'string' },
          type: { type: 'string' },
          target_entity: { type: 'string' },
          description: { type: 'string' },
          occurrences: { type: 'number' },
          strength: { type: 'number' },
          trend: { type: 'string' },
        },
      }},
      improvement_opportunities: { type: 'array', items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          target: { type: 'string' },
          target_type: { type: 'string' },
          type: { type: 'string' },
          signal_source: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          confidence: { type: 'number' },
          impact: { type: 'string' },
        },
      }},
      summary: { type: 'object' },
    },
  }}
);

const opportunities = observationReport?.improvement_opportunities || [];
log(`Observer found ${observationReport?.signals?.length || 0} signals → ${opportunities.length} improvement opportunities`);

if (!opportunities.length) {
  log('No improvement opportunities found. Evolution cycle complete.');
  return { evolved: 0, pending: 0, rejected: 0, message: 'No changes needed.' };
}

// ============================================================
// Phase 3: Evolve — 生成进化版本
// ============================================================
phase('Evolve');

// Filter opportunities by confidence threshold
const viableOpportunities = opportunities
  .filter(o => o.confidence >= 0.6)
  .sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
  });

log(`${viableOpportunities.length}/${opportunities.length} opportunities viable (confidence ≥ 0.6)`);

// Pipeline: each opportunity → generate evolution
const evolutions = await pipeline(
  viableOpportunities,
  async (opp) => {
    const evo = await agent(
      `You are the Evolver Agent. Generate an evolved version for this improvement opportunity:

      Opportunity: ${JSON.stringify(opp)}

      Current entity definitions: ${JSON.stringify(entityDefinitions)}

      Apply the appropriate mutation operator (prompt_clarify, tool_add, tool_remove,
      strategy_inject, trigger_tune, knowledge_update, example_add, constraint_add).

      Rules:
      1. Only mutate ONE dimension at a time
      2. Use semantic versioning (MAJOR.MINOR.PATCH)
      3. Keep the change minimal — only what's needed
      4. Preserve existing working behavior
      5. Risk low changes can be auto-applied; risk high changes need review

      Return the evolved entity content and metadata.`,
      { label: `evolve:${opp.target}`, schema: {
        type: 'object',
        properties: {
          evolution_id: { type: 'string' },
          target: { type: 'string' },
          target_type: { type: 'string' },
          mutation_type: { type: 'string' },
          current_version: { type: 'string' },
          new_version: { type: 'string' },
          change_description: { type: 'string' },
          diff_summary: { type: 'string' },
          risk_level: { type: 'string' },
          evolved_content: { type: 'string' },
          rollback_complexity: { type: 'string' },
        },
      }}
    );
    return evo;
  }
);

const validEvolutions = evolutions.filter(Boolean);
log(`Generated ${validEvolutions.length} evolution candidates`);

// ============================================================
// Phase 4: Validate — 适应度评估
// ============================================================
phase('Validate');

const validatedEvolutions = await pipeline(
  validEvolutions,
  async (evo) => {
    const evaluation = await agent(
      `You are the Fitness Evaluator. Evaluate this evolution candidate:

      Evolution: ${JSON.stringify(evo)}

      Perform:
      1. Regression test: would this change break existing behavior?
      2. Adversarial test: how could this change fail?
      3. Consistency check: does this conflict with other entities?

      Entities context: ${JSON.stringify(entityDefinitions?.entities || [])}

      Be conservative — reject if uncertain. Only approve if you're confident the change is a net improvement.`,
      { label: `validate:${evo.target}`, schema: {
        type: 'object',
        properties: {
          evaluation_id: { type: 'string' },
          evolution_id: { type: 'string' },
          regression_passed: { type: 'boolean' },
          adversarial_passed: { type: 'boolean' },
          consistency_passed: { type: 'boolean' },
          fitness_score: { type: 'number' },
          overall_passed: { type: 'boolean' },
          recommended_action: { type: 'string', enum: ['auto_apply', 'queue_review', 'require_approval', 'reject'] },
          reasoning: { type: 'string' },
        },
      }}
    );
    return { ...evo, evaluation };
  }
);

// Classify results
const autoApply = validatedEvolutions.filter(Boolean).filter(e =>
  e.evaluation?.recommended_action === 'auto_apply'
);
const pending = validatedEvolutions.filter(Boolean).filter(e =>
  e.evaluation?.recommended_action === 'queue_review' || e.evaluation?.recommended_action === 'require_approval'
);
const rejected = validatedEvolutions.filter(Boolean).filter(e =>
  e.evaluation?.recommended_action === 'reject' || e.evaluation?.overall_passed === false
);

log(`Validation complete: ${autoApply.length} auto-apply, ${pending.length} pending review, ${rejected.length} rejected`);

// ============================================================
// Phase 5: Deploy — 部署进化
// ============================================================
phase('Deploy');

const deployedResults = [];

// Auto-apply low-risk evolutions
if (autoApply.length > 0) {
  for (const evo of autoApply) {
    const result = await agent(
      `Apply this evolution by writing the evolved content to the target file:

      Target: ${evo.target}
      Target type: ${evo.target_type}
      Evolved content: ${evo.evolved_content}
      Change: ${evo.change_description}

      1. Read the current file content first
      2. Apply the evolution (use Edit for partial changes, Write for full rewrites)
      3. Record the evolution in .claude/aeon/evolution-history.jsonl
      4. If in a git repo, stage the changes (do NOT commit — the user will review)

      Return the path of the modified file and a summary of what changed.`,
      { label: `deploy:${evo.target}`, schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          old_version: { type: 'string' },
          new_version: { type: 'string' },
          status: { type: 'string' },
        },
      }}
    );
    deployedResults.push(result);
  }
}

// Generate pending review list for medium/high-risk evolutions
if (pending.length > 0) {
  await agent(
    `Create a review file at .claude/aeon/pending-review.md summarizing these evolutions that need human review:

    ${JSON.stringify(pending.map(e => ({
      target: e.target,
      mutation: e.mutation_type,
      change: e.change_description,
      risk: e.risk_level,
      fitness: e.evaluation?.fitness_score,
      reasoning: e.evaluation?.reasoning,
    })), null, 2)}

    Format as a readable markdown checklist.`,
    { label: 'create-review-file' }
  );
}

// ============================================================
// Generate Final Report
// ============================================================
phase('Report');

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    conversations_analyzed: transcripts?.length || 0,
    signals_found: observationReport?.signals?.length || 0,
    opportunities_identified: opportunities.length,
    evolutions_generated: validEvolutions.length,
    auto_applied: autoApply.length,
    pending_review: pending.length,
    rejected: rejected.length,
  },
  auto_applied: autoApply.map(e => ({
    target: e.target,
    version: e.new_version,
    change: e.change_description,
    fitness: e.evaluation?.fitness_score,
  })),
  pending_review: pending.map(e => ({
    target: e.target,
    mutation: e.mutation_type,
    change: e.change_description,
    risk: e.risk_level,
    fitness: e.evaluation?.fitness_score,
  })),
  rejected: rejected.map(e => ({
    target: e.target,
    reason: e.evaluation?.reasoning || 'Failed fitness evaluation',
  })),
};

log('═══════════════════════════════════════');
log('🧬 AEON Evolution Cycle Complete');
log(`   ✅ Auto-applied: ${autoApply.length}`);
log(`   ⏳ Pending review: ${pending.length}`);
log(`   ❌ Rejected: ${rejected.length}`);
log('═══════════════════════════════════════');

return report;

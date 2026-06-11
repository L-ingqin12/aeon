/**
 * AEON Evolution Engine
 *
 * 核心进化引擎 — 编排两条链路的完整循环：
 *   进化链路: Observer → Analyzer → Evolver → Fitness Evaluator → Deployment
 *   引导链路: Workflow Discoverer → Necessity Evaluator → Skill Bootstrapper
 *
 * 这是 Claude Code Workflow 脚本，通过 /evolve skill 或 Workflow 工具调用。
 * 设计为概念参考实现，展示了进化循环的完整控制流。
 */

export const meta = {
  name: 'aeon-evolution-cycle',
  description: 'Execute a full AEON cycle: evolve existing skills/agents AND discover new skill opportunities from conversations. Guided by "如无必要，勿增实体".',
  phases: [
    // 进化链路 (Evolve)
    { title: 'Collect', detail: 'Gather conversation transcripts and entity definitions' },
    { title: 'Observe', detail: 'Extract signals and patterns from conversations' },
    { title: 'Analyze', detail: 'Identify improvement opportunities for existing entities' },
    { title: 'Evolve', detail: 'Generate evolved versions of skills/agents/memories' },
    { title: 'Validate', detail: 'Fitness evaluation: regression, adversarial, consistency' },
    { title: 'Deploy', detail: 'Apply passing evolutions, queue others for review' },
    // 引导链路 (Bootstrap)
    { title: 'Discover', detail: 'Scan conversations for repeatable workflows not yet captured as skills' },
    { title: 'Evaluate Necessity', detail: '6-gate check: frequency, stability, scope, overlap, complexity, routing' },
    { title: 'Bootstrap', detail: 'Generate well-structured skill definitions from validated patterns' },
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

// ============================================================
// PART 2: BOOTSTRAP PIPELINE — 技能自主发现与引导
// ============================================================
// 原则: "如无必要，勿增实体" — 默认答案是 NO。
// 只有通过全部 6 道关卡的模式才会被创建为 skill。

phase('Discover');

const workflowPatterns = await agent(
  `You are the Workflow Discoverer Agent. Scan the conversation transcripts for repeatable
   multi-step workflows that are NOT yet captured as existing skills.

   Transcripts: ${JSON.stringify(transcripts?.slice(0, 50) || [])}
   Existing entities: ${JSON.stringify(entityDefinitions?.entities || [])}

   Find patterns where:
   1. The user repeatedly executes similar command sequences (≥3 times)
   2. The user consistently guides the agent through the same multi-step process
   3. The user manually adds the same missing steps to agent outputs

   Filter OUT:
   - One-off debugging sessions
   - Single-step commands
   - Tasks where the user said "just this once"
   - Patterns already perfectly covered by existing skills

   For each pattern found, extract the core sequence, trigger phrases, required inputs,
   expected outputs, and stability assessment.`,
  { label: 'discover-workflows', schema: {
    type: 'object',
    properties: {
      patterns_found: { type: 'array', items: {
        type: 'object',
        properties: {
          pattern_id: { type: 'string' },
          intent: { type: 'string' },
          summary: { type: 'string' },
          occurrences: { type: 'number' },
          core_sequence: { type: 'array' },
          trigger_phrases: { type: 'array', items: { type: 'string' } },
          stability: { type: 'object' },
        },
      }},
      summary: { type: 'object' },
    },
  }}
);

const discoveredPatterns = workflowPatterns?.patterns_found || [];
log(`Workflow Discoverer found ${discoveredPatterns.length} repeatable patterns`);

if (discoveredPatterns.length === 0) {
  log('No new workflow patterns discovered. Bootstrap pipeline skipped.');
  return { ...report, bootstrapped: 0, bootstrap_candidates: 0 };
}

// ============================================================
// Necessity Evaluation — 6道关卡
// ============================================================
phase('Evaluate Necessity');

const evaluatedPatterns = await pipeline(
  discoveredPatterns,
  async (pattern) => {
    const evaluation = await agent(
      `You are the Necessity Evaluator. Your default answer is NO. Only say YES if the
       pattern truly warrants a new skill and cannot be handled by a simpler mechanism.

       Pattern to evaluate:
       ${JSON.stringify(pattern)}

       Existing entities (for overlap check):
       ${JSON.stringify(entityDefinitions?.entities || [])}

       Apply the 6 gates in order. STOP at the first NO:

       Gate 1 (Frequency): ≥3 occurrences in last 50 conversations?
       Gate 2 (Stability): Has the core sequence converged and stabilized?
       Gate 3 (Scope): Clear triggers, inputs, outputs, and termination?
       Gate 4 (Overlap): No existing skill covers ≥80% of this?
       Gate 5 (Complexity): ≥2 of [≥3 steps, specific tools, branching logic, specific output format]?
       Gate 6 (Routing): No trigger ambiguity with existing skills?

       Return detailed per-gate results and your verdict.`,
      { label: `necessity:${pattern.pattern_id}`, schema: {
        type: 'object',
        properties: {
          evaluation_id: { type: 'string' },
          pattern_id: { type: 'string' },
          verdict: {
            type: 'object',
            properties: {
              should_create_skill: { type: 'boolean' },
              recommended_action: { type: 'string', enum: ['bootstrap_skill', 'memory', 'evolve_existing', 'ignore'] },
              reasoning: { type: 'string' },
            },
          },
          gates: { type: 'object' },
          alternatives: { type: 'array' },
        },
      }}
    );
    return { ...pattern, evaluation };
  }
);

const passed = evaluatedPatterns.filter(Boolean).filter(p =>
  p.evaluation?.verdict?.should_create_skill === true
);
const memoryOnly = evaluatedPatterns.filter(Boolean).filter(p =>
  p.evaluation?.verdict?.recommended_action === 'memory'
);
const evolveInstead = evaluatedPatterns.filter(Boolean).filter(p =>
  p.evaluation?.verdict?.recommended_action === 'evolve_existing'
);
const rejectedPatterns = evaluatedPatterns.filter(Boolean).filter(p =>
  p.evaluation?.verdict?.recommended_action === 'ignore'
);

log(`Necessity evaluation: ${passed.length} pass, ${memoryOnly.length} → memory, ${evolveInstead.length} → evolve existing, ${rejectedPatterns.length} rejected`);

// Create memory entries for patterns that failed at gates
if (memoryOnly.length > 0) {
  log(`Creating ${memoryOnly.length} memory entries for simpler patterns...`);
  await pipeline(
    memoryOnly,
    (p) => agent(
      `Create a memory entry for this pattern that didn't warrant a full skill:
       Pattern: ${JSON.stringify(p)}
       Suggested memory content: ${JSON.stringify(p.evaluation?.alternatives?.[0])}

       Write the memory file. Keep it concise — one clear preference or lesson.`,
      { label: `memory:${p.pattern_id}` }
    )
  );
}

if (evolveInstead.length > 0) {
  log(`${evolveInstead.length} patterns → recommend evolving existing skills instead`);
  // These will be picked up by the next evolution cycle
}

// ============================================================
// Skill Bootstrapping — 仅对通过6关的模式
// ============================================================
phase('Bootstrap');

const bootstrappedSkills = [];
if (passed.length > 0) {
  for (const pattern of passed) {
    const skillDef = await agent(
      `You are the Skill Bootstrapper. Create a complete, well-structured skill definition
       from this validated workflow pattern:

       Pattern: ${JSON.stringify(pattern)}
       Necessity verdict: ${JSON.stringify(pattern.evaluation)}

       Generate a skill file with:
       1. Name (kebab-case, not conflicting with existing skills)
       2. Description with precise trigger phrases (from actual conversations)
       3. Instructions (5-part structure: Understand → Execute → Analyze → Present → Follow-up)
       4. Tool selection (only what's actually needed)
       5. Edge cases (success AND failure paths)
       6. Metadata recording source conversations and creation context

       Save to .claude/skills/<name>.md

       Principles:
       - Every instruction step must come from real conversation patterns, not imagination
       - Trigger phrases must not overlap with existing skills
       - Keep it minimal — don't add "nice to have" features`,
      { label: `bootstrap:${pattern.pattern_id}`, schema: {
        type: 'object',
        properties: {
          skill_name: { type: 'string' },
          file_path: { type: 'string' },
          version: { type: 'string' },
          summary: { type: 'string' },
          trigger_phrases: { type: 'array', items: { type: 'string' } },
          instruction_steps: { type: 'number' },
        },
      }}
    );
    bootstrappedSkills.push(skillDef);
  }
}

log(`Bootstrapped ${bootstrappedSkills.length} new skills`);

// ============================================================
// Final Combined Report
// ============================================================
log('═══════════════════════════════════════');
log('🧬 AEON Full Cycle Complete');
log('══ 进化链路 (Evolve) ══');
log(`   ✅ Auto-applied: ${autoApply.length}`);
log(`   ⏳ Pending review: ${pending.length}`);
log(`   ❌ Rejected: ${rejected.length}`);
log('══ 引导链路 (Bootstrap) ══');
log(`   🏭 Skills created: ${bootstrappedSkills.length}`);
log(`   📝 Memory entries: ${memoryOnly.length}`);
log(`   🔧 → Evolve existing: ${evolveInstead.length}`);
log(`   🗑️ Rejected: ${rejectedPatterns.length}`);
log('═══════════════════════════════════════');

return {
  ...report,
  bootstrap: {
    patterns_discovered: discoveredPatterns.length,
    passed_6_gates: passed.length,
    skills_created: bootstrappedSkills.map(s => s?.skill_name).filter(Boolean),
    memory_entries_created: memoryOnly.length,
    evolve_instead: evolveInstead.map(p => p?.pattern_id).filter(Boolean),
    rejected: rejectedPatterns.map(p => ({
      pattern: p?.pattern_id,
      reason: p?.evaluation?.verdict?.reasoning,
    })).filter(Boolean),
  },
};

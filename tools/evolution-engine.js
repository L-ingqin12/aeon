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
    { title: 'Evaluate Necessity', detail: '7-gate check: G0 script-first + G1-G6 skill necessity. Scripts for closed-world, skills for open-world' },
    { title: 'Bootstrap', detail: 'Generate scripts (closed-world) or skill definitions (open-world) from validated patterns' },
  ],
};

// ============================================================
// Phase 1: Collect — 收集数据
// ============================================================
phase('Collect');

// 确定性 I/O — 1 次轻量 agent 调用，不做语义分析
const fs = await agent(
  `Run these commands and return ONLY raw output, no analysis:
   1. ls .claude/transcripts/ 2>/dev/null | tail -50 || echo "NO_TRANSCRIPTS"
   2. find . -path '*/.claude/skills/*.md' -o -path '*/agents/*.md' -o -name 'CLAUDE.md' 2>/dev/null | head -50
   3. cat .claude/aeon/evolution-history.jsonl 2>/dev/null | tail -20 || echo "NO_HISTORY"`,
  { label: 'collect-files' }
);

// ============================================================
// Phase 2: Observe — 提取信号
// ============================================================
phase('Observe');

const observationReport = await agent(
  `You are the Observer Agent. Below is raw collected data from the project.
   Analyze it to extract evolution signals. File scanning was done deterministically — you only do semantic analysis.

   Collected data:
   ${fs}

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
const entitiesFound = observationReport?.entities_observed || [];
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

      Entity definitions (from observer scan):
      ${JSON.stringify(entitiesFound)}

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

      Entities context: ${JSON.stringify(entitiesFound)}

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
    conversations_analyzed: observationReport?.source_conversations_count || 0,
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
  `You are the Workflow Discoverer Agent. Scan the collected data for repeatable
   multi-step workflows that are NOT yet captured as existing skills.

   Collected project data:
   ${fs}
   Existing entities (from observer):
   ${JSON.stringify(entitiesFound)}

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
// Necessity Evaluation — 7道关卡
// G0 脚本优先（预计算）+ G1/G5/G6 预计算，G2/G3/G4 留给 agent
// ============================================================
phase('Evaluate Necessity');

const evaluatedPatterns = await pipeline(
  discoveredPatterns,
  async (pattern) => {
    // --- 预计算：G0 脚本优先（封闭世界 vs 开放世界）---
    const coreSequence = pattern.core_sequence || [];
    const closedWorldOps = ['grep','find','ls','cat','wc','sort','uniq','head','tail','git status','git log','git diff','npm run lint','npm test','yarn build','eslint','prettier','docker build','kubectl apply','curl','jq','sed','awk'];
    const openWorldPatterns = ['analyze','判断','建议','推荐','review','分析','debug','排查','修复','fix','原因','根因','是否合理','应该如何'];
    const closedCount = coreSequence.filter(s => closedWorldOps.some(kw => (s.action||s.command||'').toLowerCase().includes(kw))).length;
    const openCount = coreSequence.filter(s => openWorldPatterns.some(kw => (s.action||s.command||'').toLowerCase().includes(kw))).length;
    const closedRatio = coreSequence.length > 0 ? closedCount / coreSequence.length : 0;
    const gate0_pass = closedRatio >= 0.8 && openCount === 0;

    if (gate0_pass) {
      return { ...pattern, evaluation: { verdict: { should_create_skill: false, should_create_script: true, recommended_action: 'script', reasoning: `Gate 0: 封闭世界 — 脚本更高效准确` }, gates: { gate_0_script_first: { passed: true } } } };
    }

    // --- 预计算：G1/G5/G6 ---
    const gate1_pass = (pattern.occurrences || 0) >= 3;
    const steps = coreSequence.length;
    const complexityScore = [steps >= 3, (pattern.tools_used||[]).length >= 1, (pattern.variations||[]).length >= 1, (pattern.expected_outputs||[]).length >= 1].filter(Boolean).length;
    const gate5_pass = complexityScore >= 2;
    const overlaps = (pattern.trigger_phrases || []).filter(p => entitiesFound.filter(e => e.type === 'skill').map(e => (e.content_summary||'')).join(' ').toLowerCase().includes(p.toLowerCase()));
    const gate6_pass = overlaps.length === 0;

    const precomputed = [
      `❌ Gate 0: ${openCount > 0 ? '开放世界操作 → 需LLM推理' : `确定性占比${Math.round(closedRatio*100)}%<80%`}`,
      `Gate 1: ${pattern.occurrences||0}次 ${gate1_pass?'≥3→PASS':'<3→FAIL'}`,
      `Gate 5: ${complexityScore}/4 ${gate5_pass?'≥2→PASS':'<2→FAIL'}`,
      `Gate 6: ${gate6_pass?'无冲突→PASS':`冲突:[${overlaps}]→FAIL`}`,
    ];

    const evaluation = await agent(
      `You are the Necessity Evaluator. Default: NO.

       Pattern: ${JSON.stringify(pattern)}
       Existing: ${JSON.stringify(entitiesFound)}

       PRE-COMPUTED (facts, do NOT re-evaluate):
       ${precomputed.join('\n')}

       If G1/G5/G6 failed → output FAIL, skip G2/G3/G4.
       Only if all passed, evaluate:
       Gate 2 (Stability): Sequence converged?
       Gate 3 (Scope): Triggers/inputs/outputs clear?
       Gate 4 (Overlap): Existing skill covers <80%?

       Return verdict.`,
      { label: `necessity:${pattern.pattern_id}`, schema: {
        type: 'object', properties: {
          verdict: { type: 'object', properties: { should_create_skill: { type: 'boolean' }, recommended_action: { type: 'string' }, reasoning: { type: 'string' } } },
          gates: { type: 'object' },
        },
      }}
    );
    return { ...pattern, evaluation };
  }
);

const passed = evaluatedPatterns.filter(Boolean).filter(p => p.evaluation?.verdict?.should_create_skill === true);
const scriptsOnly = evaluatedPatterns.filter(Boolean).filter(p => p.evaluation?.verdict?.should_create_script === true);
const memoryOnly = evaluatedPatterns.filter(Boolean).filter(p => p.evaluation?.verdict?.recommended_action === 'memory');
const evolveInstead = evaluatedPatterns.filter(Boolean).filter(p => p.evaluation?.verdict?.recommended_action === 'evolve_existing');
const rejectedPatterns = evaluatedPatterns.filter(Boolean).filter(p => p.evaluation?.verdict?.recommended_action === 'ignore');

log(`Necessity: ${scriptsOnly.length}→script, ${passed.length}→skill, ${memoryOnly.length}→memory, ${evolveInstead.length}→evolve, ${rejectedPatterns.length} rejected`);

// Memory entries
if (memoryOnly.length > 0) {
  await pipeline(memoryOnly, (p) => agent(`Create memory: ${JSON.stringify(p)}`, { label: `memory:${p.pattern_id}` }));
}

// ============================================================
// Bootstrap: Scripts (Gate 0) + Skills (Gate 1-6)
// ============================================================
phase('Bootstrap');

// Script generation（封闭世界 → 确定性脚本）
const generatedScripts = [];
if (scriptsOnly.length > 0) {
  for (const pattern of scriptsOnly) {
    const s = await agent(
      `SCRIPT MODE: Generate bash script + thin skill wrapper for closed-world pattern:
       ${JSON.stringify(pattern)}
       Save: .claude/scripts/<name>.sh + .claude/skills/<name>.md (thin wrapper)`,
      { label: `script:${pattern.pattern_id}`, schema: { type: 'object', properties: { script_path: { type: 'string' }, script_name: { type: 'string' } } } }
    );
    generatedScripts.push(s);
  }
}

// Skill generation（开放世界 → 完整 skill）
const bootstrappedSkills = [];
if (passed.length > 0) {
  for (const pattern of passed) {
    const skillDef = await agent(
      `SKILL MODE: Create full skill definition from validated pattern:

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
log(`   🔧 Scripts: ${generatedScripts.length} (封闭世界→确定性执行)`);
log(`   🏭 Skills: ${bootstrappedSkills.length} (开放世界→LLM推理)`);
log(`   📝 Memory: ${memoryOnly.length} | 🔧→Evolve: ${evolveInstead.length} | 🗑️Rejected: ${rejectedPatterns.length}`);
log('═══════════════════════════════════════');

return {
  ...report,
  bootstrap: {
    patterns_discovered: discoveredPatterns.length,
    gate_0_scripts: generatedScripts.length,
    passed_7_gates: passed.length,
    scripts_created: generatedScripts.map(s => s?.script_name).filter(Boolean),
    skills_created: bootstrappedSkills.map(s => s?.skill_name).filter(Boolean),
    memory_entries_created: memoryOnly.length,
  },
};

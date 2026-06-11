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
// Phase 1: Collect — 收集数据（确定性操作，零 agent 调用）
// ============================================================
phase('Collect');

// 直接用工具列举文件，不浪费 agent token
const fs = await agent(
  `Run these commands and return the raw output:
   1. ls .claude/transcripts/ 2>/dev/null | tail -50 || echo "[]"
   2. find . -path '*/.claude/skills/*.md' -o -path '*/agents/*.md' -o -path '*/memory/*.md' -o -name 'CLAUDE.md' 2>/dev/null | head -50
   3. cat .claude/aeon/evolution-history.jsonl 2>/dev/null | tail -20 || echo "[]"
   Return ONLY the raw command outputs, no analysis.`,
  { label: 'collect-files' }
);

// Phase 1 是纯 I/O — 1 次 agent 调用就够了（仅用于执行 bash）
// 对比旧版：3 次 agent 调用，其中 2 次纯属浪费

// ============================================================
// Phase 2: Observe — 提取信号（需要语义理解，保留 agent）
// ============================================================
phase('Observe');

const observationReport = await agent(
  `You are the Observer Agent. Below is raw collected data from the project.
   Analyze it to extract evolution signals.

   Raw collected data:
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

      Current entity definitions (from scan):
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
// Necessity Evaluation — 7道关卡 (Gate 0 Script-First + Gates 1-6)
// G0/G1/G5/G6 预计算（确定性，零 token），G2/G3/G4 留给 agent 语义判断
// ============================================================
phase('Evaluate Necessity');

const evaluatedPatterns = await pipeline(
  discoveredPatterns,
  async (pattern) => {
    // --- 预计算：G0 脚本优先（封闭世界 vs 开放世界）---
    // 关键判断：路径和结果是否确定？异常是否可枚举？
    const coreSequence = pattern.core_sequence || [];
    // 封闭世界操作：输入固定、输出固定、异常可预知
    const closedWorldOps = [
      'grep', 'find', 'ls', 'cat', 'wc', 'sort', 'uniq', 'head', 'tail',
      'git status', 'git log', 'git diff', 'git branch',
      'npm run lint', 'npm run typecheck', 'npm test', 'yarn build',
      'eslint', 'prettier', 'tsc --noEmit',
      'docker build', 'kubectl apply', 'kubectl get',
      'curl', 'jq', 'sed', 'awk', 'cp', 'mv', 'rm',
    ];
    // 开放世界操作：需要推理、判断、情境分析
    const openWorldPatterns = [
      'analyze', '判断', '建议', '推荐', 'review', '分析',
      'debug', '排查', '修复', 'fix', '原因', '根因',
      '是否合理', '是否正确', '应该', '如何',
    ];
    const closedWorldSteps = coreSequence.filter(step => {
      const action = (step.action || step.command || '').toLowerCase();
      return closedWorldOps.some(kw => action.includes(kw));
    });
    const openWorldSteps = coreSequence.filter(step => {
      const action = (step.action || step.command || '').toLowerCase();
      return openWorldPatterns.some(kw => action.includes(kw));
    });
    // 封闭世界操作占比高 + 无开放世界操作 → 脚本
    const closedRatio = coreSequence.length > 0 ? closedWorldSteps.length / coreSequence.length : 0;
    const hasOpenWorldOps = openWorldSteps.length > 0;
    const gate0_pass = closedRatio >= 0.8 && !hasOpenWorldOps;

    // --- 预计算：G1 频率（纯计数）---
    const occurrences = pattern.occurrences || 0;
    const gate1_pass = occurrences >= 3;

    // --- 预计算：G5 复杂度（可量化指标）---
    const steps = coreSequence.length;
    const hasSpecificTools = (pattern.tools_used || []).length >= 1;
    const hasBranching = (pattern.variations || []).length >= 1;
    const hasOutputFormat = pattern.expected_outputs?.length >= 1;
    const complexityScore = [steps >= 3, hasSpecificTools, hasBranching, hasOutputFormat].filter(Boolean).length;
    const gate5_pass = complexityScore >= 2;

    // --- 预计算：G6 路由冲突（字符串匹配）---
    const triggerPhrases = pattern.trigger_phrases || [];
    const existingTriggers = entitiesFound
      .filter(e => e.type === 'skill' || e.type === 'agent')
      .map(e => e.content_summary || '')
      .join(' ');
    const overlaps = triggerPhrases.filter(phrase =>
      existingTriggers.toLowerCase().includes(phrase.toLowerCase())
    );
    const gate6_pass = overlaps.length === 0;

    // --- 构建预计算结果 ---
    const precomputedGates = [];
    if (gate0_pass) {
      precomputedGates.push(`✅ Gate 0 (Script-First): 封闭世界问题 — ${Math.round(closedRatio * 100)}% 确定性操作，无开放世界判断 → PASS → 生成脚本`);
    } else if (hasOpenWorldOps) {
      precomputedGates.push(`❌ Gate 0 (Script-First): 包含开放世界操作 (${openWorldSteps.map(s => s.action || s.command).join(', ')}) → 需要 LLM 推理 → 继续 skill 评估`);
    } else {
      precomputedGates.push(`❌ Gate 0 (Script-First): 确定性操作占比 ${Math.round(closedRatio * 100)}% < 80% → 继续 skill 评估`);
    }
    if (gate0_pass) {
      // Gate 0 通过 — 封闭世界问题，脚本即可 → 跳过后续
      return {
        ...pattern,
        evaluation: {
          verdict: {
            should_create_skill: false,
            should_create_script: true,
            recommended_action: 'script',
            reasoning: `Gate 0: 封闭世界问题 — 路径和结果确定，异常可枚举 → 脚本更高效准确`,
          },
          gates: {
            gate_0_script_first: { passed: true, closed_ratio: closedRatio },
          },
        },
      };
    }
    precomputedGates.push(`Gate 1 (Frequency): ${occurrences}次 ${gate1_pass ? '≥3 → PASS' : '<3 → FAIL'}`);
    precomputedGates.push(`Gate 5 (Complexity): ${complexityScore}/4 ${gate5_pass ? '≥2 → PASS' : '<2 → FAIL'}`);
    precomputedGates.push(`Gate 6 (Routing): ${gate6_pass ? '无冲突 → PASS' : `冲突: [${overlaps.join(', ')}] → FAIL`}`);

    // --- G2/G3/G4 需要语义判断，留给 agent ---
    const evaluation = await agent(
      `You are the Necessity Evaluator. Default answer: NO.

       Pattern: ${JSON.stringify(pattern)}
       Existing entities: ${JSON.stringify(entitiesFound)}

       PRE-COMPUTED FACTS (do NOT re-evaluate):
       ${precomputedGates.join('\n')}

       If G1/G5/G6 already failed → output pre-computed FAIL verdict, skip G2/G3/G4.
       If all pre-computed passed → ONLY evaluate:
       Gate 2 (Stability): Sequence converged?
       Gate 3 (Scope): Triggers/inputs/outputs clear?
       Gate 4 (Overlap): Existing skill covers <80%?

       Return per-gate results + final verdict.`,

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
const scriptsOnly = evaluatedPatterns.filter(Boolean).filter(p =>
  p.evaluation?.verdict?.should_create_script === true
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

log(`Necessity evaluation: ${scriptsOnly.length} → script, ${passed.length} → skill, ${memoryOnly.length} → memory, ${evolveInstead.length} → evolve existing, ${rejectedPatterns.length} rejected`);

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
// Bootstrap: Script Generation（Gate 0 通过） + Skill Generation（Gate 1-6 通过）
// ============================================================
phase('Bootstrap');

// --- Script Generation: 封闭世界问题，生成可执行脚本 ---
const generatedScripts = [];
if (scriptsOnly.length > 0) {
  for (const pattern of scriptsOnly) {
    const scriptResult = await agent(
      `You are the Skill Bootstrapper in SCRIPT MODE. Generate a bash script for this closed-world workflow:

       Pattern: ${JSON.stringify(pattern)}
       Scriptable ratio: ${pattern.evaluation?.gates?.gate_0_script_first?.closed_ratio}

       The workflow is deterministic — fixed inputs, fixed outputs, enumerable errors.
       Generate:
       1. A bash script (.sh) that executes the workflow deterministically
       2. A thin SKILL.md wrapper that tells the agent when to run the script and how to interpret output

       Script guidelines:
       - set -euo pipefail
       - Comment what each step does
       - Exit codes for known failure modes
       - Output plain text that the agent can interpret
       - No interactive prompts

       Save script to: .opencode/script/<name>.sh (or .claude/scripts/<name>.sh)
       Save wrapper to: .opencode/skill/<name>/SKILL.md`,
      { label: `script:${pattern.pattern_id}`, schema: {
        type: 'object',
        properties: {
          script_path: { type: 'string' },
          skill_wrapper_path: { type: 'string' },
          script_name: { type: 'string' },
          summary: { type: 'string' },
        },
      }}
    );
    generatedScripts.push(scriptResult);
  }
}
log(`Generated ${generatedScripts.length} scripts (closed-world → deterministic execution)`);

// --- Skill Generation: 开放世界问题，生成完整 skill ---
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

log('══ 引导链路 (Bootstrap) ══');
log(`   🔧 Scripts created: ${generatedScripts.length} (封闭世界 → 确定性执行)`);
log(`   🏭 Skills created: ${bootstrappedSkills.length} (开放世界 → LLM 推理)`);
log(`   📝 Memory entries: ${memoryOnly.length}`);
log(`   🔧 → Evolve existing: ${evolveInstead.length}`);
log(`   🗑️ Rejected: ${rejectedPatterns.length}`);
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
    evolve_instead: evolveInstead.map(p => p?.pattern_id).filter(Boolean),
    rejected: rejectedPatterns.map(p => ({
      pattern: p?.pattern_id,
      reason: p?.evaluation?.verdict?.reasoning,
    })).filter(Boolean),
  },
};

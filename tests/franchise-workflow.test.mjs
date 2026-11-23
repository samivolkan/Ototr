import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import data from "../ajan-ofisi/franchise-workflow-data.mjs";
import {
  admission,
  proposeAgenda,
  canAdvanceScenario,
  evaluateScenario,
  SCENARIOS,
  deduplicateEvents,
  observedState,
  snapshotSummary,
  briefing,
  planMarkdown,
  evidenceUrl,
} from "../ajan-ofisi/franchise-workflow-model.mjs";
const require = createRequire(import.meta.url),
  { validatePlan, guard } = require("../ajan-ofisi/runtime/policy.cjs");
const root = new URL("../", import.meta.url);
const roster = JSON.parse(
  fs.readFileSync(new URL("ajan-ofisi/office-data.json", root), "utf8"),
);
test("uses the existing four FRA specialists and keeps execution disabled", () => {
  assert.deepEqual(
    data.agents.map((a) => a.id),
    roster.departments.find((d) => d.id === "FRA").agents.map((a) => a.id),
  );
  assert.equal(data.codeWrite, false);
  assert.equal(data.modelExecution, false);
});
test("14 stage titles and order match canonical Franchise lifecycle", () => {
  const s = fs.readFileSync(new URL("gm-franchise/index.html", root), "utf8");
  const canonical = JSON.parse(s.match(/const E2E_STAGES=(\[[^;]+\]);/)[1]);
  assert.deepEqual(
    data.stages.map((s) => s.title),
    canonical,
  );
  for (let i = 0; i < data.stages.length; i++) {
    const s = data.stages[i];
    assert.equal(s.index, i);
    assert.ok(data.agents.some((a) => a.id === s.agent));
    assert.deepEqual(s.requires, i ? [data.stages[i - 1].id] : []);
  }
});
test("every evidence excerpt has real path/range and matching hash", () => {
  for (const e of Object.values(data.evidence)) {
    const lines = fs
      .readFileSync(new URL(e.file, root), "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/);
    const actual = lines.slice(e.start - 1, e.end).join("\n");
    assert.equal(actual, e.excerpt, e.file);
    assert.equal(createHash("sha256").update(e.excerpt).digest("hex"), e.hash);
    assert.match(e.commit, /^[a-f0-9]{40}$/);
    assert.ok(evidenceUrl(e).includes(e.commit));
  }
});
test("all seven proposals pass existing phase1 structural validator and require independent review", () => {
  assert.equal(data.plans.length, 7);
  for (const p of data.plans) {
    assert.deepEqual(
      validatePlan(
        p,
        data.agents.find((a) => a.id === p.owner),
      ),
      [],
    );
    assert.equal(p.semanticReview, "pending");
    assert.equal(guard(p, p.owner).required, true);
    assert.notEqual(p.owner, p.reviewer);
  }
});
test("missing plan evidence rejected by original guard precheck", () => {
  const p = { ...data.plans[0], evidence: [] };
  assert.ok(validatePlan(p, data.agents[0]).length);
});
test("ten pending plus reserved blocks intake even with free time", () => {
  assert.equal(
    admission({ pending: 8, reserved: 2, today: 0, week: 0 }).code,
    "queue",
  );
});
test("nine slots permits one reservation; not more", () => {
  assert.equal(
    admission({ pending: 8, reserved: 1, today: 0, week: 0 }).allowed,
    true,
  );
  assert.equal(
    admission({ pending: 9, reserved: 1, today: 0, week: 0 }).allowed,
    false,
  );
});
test("45 daily minute cap includes review reservation", () => {
  assert.equal(
    admission({ pending: 0, reserved: 0, today: 40, week: 100 }).allowed,
    true,
  );
  assert.equal(
    admission({ pending: 0, reserved: 0, today: 41, week: 100 }).code,
    "daily",
  );
});
test("840 weekly minute cap is independent of daily space", () => {
  assert.equal(
    admission({ pending: 0, reserved: 0, today: 0, week: 835 }).allowed,
    true,
  );
  assert.equal(
    admission({ pending: 0, reserved: 0, today: 0, week: 836 }).code,
    "weekly",
  );
});
test("unknown and invalid capacity fails closed", () => {
  for (const n of [undefined, null, NaN, -1, 1.5, Infinity, "0"])
    assert.equal(
      admission({ pending: n, reserved: 0, today: 0, week: 0 }).allowed,
      false,
    );
  assert.equal(
    admission({ pending: 0, reserved: 0, today: 0, week: 0, minutes: 0 })
      .allowed,
    false,
  );
});
test("processed finance delivery never means business acceptance", () => {
  assert.equal(evaluateScenario(SCENARIOS[0]).state, "acceptance");
});
test("revision mismatch invalidates old approval", () => {
  assert.equal(evaluateScenario(SCENARIOS[1]).state, "revision");
});
test("missing evidence blocks, not inferred success", () => {
  assert.equal(evaluateScenario(SCENARIOS[3]).state, "blocked");
});
test("producer cannot act as own independent reviewer", () => {
  assert.equal(
    evaluateScenario(SCENARIOS[0], { producer: "FRA-02", reviewer: "FRA-02" })
      .state,
    "blocked",
  );
});
test("even complete synthetic packet stays in review, never activated or paid", () => {
  const s = evaluateScenario({ ...SCENARIOS[0], financeAccepted: true });
  assert.equal(s.state, "review");
  assert.equal("activated" in s, false);
  assert.equal("paid" in s, false);
});
test("replayed identical events deduplicate; revisions and conflicting evidence remain", () => {
  const a = {
      caseId: "demo",
      type: "finance",
      revision: 2,
      payload: { a: 1, b: 2 },
    },
    b = {
      type: "finance",
      caseId: "demo",
      revision: 2,
      payload: { b: 2, a: 1 },
    };
  assert.equal(deduplicateEvents([a, b]).length, 1);
  assert.equal(deduplicateEvents([a, { ...a, revision: 3 }]).length, 2);
  assert.equal(deduplicateEvents([a, { ...a, payload: { a: 9 } }]).length, 2);
});
test("missing live source remains unknown while verified zero is zero", () => {
  assert.equal(observedState(null).known, false);
  assert.equal(observedState({ case_count: 0 }).count, 0);
  assert.equal(observedState({ case_count: "0" }).known, false);
  assert.equal(snapshotSummary(null).approvals, "doğrulanamadı");
});
test("brief does not mistake plans or stage design for completed live work", () => {
  const text = briefing(null);
  assert.match(text, /kaynak inceleme planıdır/);
  assert.match(text, /doğrulanamadı/);
  assert.match(text, /otomatik eklenmedi/);
  assert.match(text, /Kod yazma kapalı/);
  assert.doesNotMatch(text, /\[object Object\]/);
});
test("exports include all mandatory plan sections and pending review", () => {
  for (const p of data.plans) {
    const text = planMarkdown(p);
    for (const heading of [
      "Bulgu",
      "Kanıt",
      "Öneri",
      "Risk",
      "Tahmini efor",
      "Sami’den istenen karar",
    ])
      assert.ok(text.includes("## " + heading));
    assert.match(text, /bağımsız denetim bekliyor/);
  }
});

test("missing integration dependency is documented without claiming the main UI is broken", () => {
  for (const path of data.sourceAudit.missingPaths)
    assert.equal(fs.existsSync(new URL(path, root)), false);
  assert.ok(data.plans.some((p) => p.id === "FP07" && p.risk === "şema"));
});

test("simulation cannot step through a full queue or missing evidence", () => {
  assert.equal(canAdvanceScenario(SCENARIOS[2], 0), false);
  assert.equal(canAdvanceScenario(SCENARIOS[3], 0), false);
  assert.equal(canAdvanceScenario(SCENARIOS[4], 0), false);
  assert.equal(canAdvanceScenario(SCENARIOS[0], 0), true);
  assert.equal(canAdvanceScenario(SCENARIOS[1], 3), false);
  assert.equal(canAdvanceScenario(SCENARIOS[0], 5), false);
});

test("live agenda treats unknown source and missing fields as unknown", () => {
  assert.equal(proposeAgenda(null).known, false);
  assert.equal(proposeAgenda({ case_count: 0 }).known, false);
});
test("verified empty source produces no synthetic operational jobs", () => {
  const a = proposeAgenda({
    case_count: 0,
    approvals: 0,
    finance_pending: 0,
    finance_failed: 0,
    finance_processed: 0,
  });
  assert.equal(a.known, true);
  assert.equal(a.items.length, 0);
});
test("live agenda prioritizes failed transfer then approvals without business mutations", () => {
  const a = proposeAgenda({
    case_count: 4,
    approvals: 1,
    finance_pending: 2,
    finance_failed: 1,
    finance_processed: 3,
  });
  assert.equal(a.items[0].title, "Finans devir hatasını incele");
  assert.equal(a.items[1].owner, "FRA-04");
  assert.match(a.items[3].action, /iş kabulü veya tahsilat değildir/);
  assert.equal(a.items.length, 4);
});

test("department matrix preserves 13 human departments and 39 deliverables without adding agents", () => {
  assert.equal(Object.keys(data.departmentDeliverables).length, 13);
  assert.equal(Object.values(data.departmentDeliverables).flat().length, 39);
  assert.equal(data.agents.length, 4);
});

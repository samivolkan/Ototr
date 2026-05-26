const requiredEnv = [
  'OTOTR_SUPABASE_URL',
  'OTOTR_SUPABASE_ANON_KEY',
  'OTOTR_SUPABASE_TEST_EMAIL',
  'OTOTR_SUPABASE_TEST_PASSWORD',
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`${name} is required.`);
  }
}

const baseUrl = process.env.OTOTR_SUPABASE_URL.replace(/\/$/, '');
const anonKey = process.env.OTOTR_SUPABASE_ANON_KEY;
const email = process.env.OTOTR_SUPABASE_TEST_EMAIL;
const password = process.env.OTOTR_SUPABASE_TEST_PASSWORD;
const keepSmokeData =
  process.argv.includes('--keep') || process.env.OTOTR_KEEP_SMOKE_TEST === '1';

const session = await signIn();
const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
};

const actor = await restSingle(
  'app_users?select=id,full_name,role,branch_id&is_active=eq.true',
);

const unique = Date.now().toString().slice(-6);
const plate = `16T${unique.slice(-4)}`;
const vin = 'WVWZZZ3CZEE123456';

const caseId = await rpc('create_branch_work_order', {
  customer_full_name: `Canli Smoke ${unique}`,
  customer_phone: `555${unique.slice(-7).padStart(7, '0')}`.slice(0, 10),
  customer_email: '',
  customer_identity_number: '',
  customer_role: 'Musteri',
  vehicle_plate: plate,
  vehicle_vin: vin,
  vehicle_brand: 'Volkswagen',
  vehicle_model: 'Passat',
  vehicle_year: 2020,
  vehicle_fuel_type: 'Benzin',
  vehicle_transmission: 'Otomatik',
  vehicle_kilometers: 123456,
  vehicle_seller_type: 'Bireysel',
  vehicle_arrival_note: 'Live smoke test',
  package_type: 'PREMIUM',
  work_order_notes: 'Codex live smoke test',
});

let workOrder = await fetchWorkOrder(caseId);
assert(workOrder.status === 'START_EVIDENCE_REQUIRED', 'case starts at evidence gate');

let tasks = await fetchTasks(caseId);
assert(tasks.length === 10, `premium task count is 10, got ${tasks.length}`);
assert(
  tasks.every((task) => task.status === 'LOCKED'),
  'all tasks are locked before start evidence',
);

await upsertStartEvidence(caseId, actor.id, vin);
await patch(
  `expertise_cases?id=eq.${caseId}`,
  {
    status: 'TECHNICAL_ENTRY_OPEN',
    inspection_started_at: new Date().toISOString(),
  },
);
await patch(
  `inspection_tasks?expertise_case_id=eq.${caseId}&owner_user_id=is.null&status=in.(LOCKED,ASSIGNED)`,
  { status: 'AVAILABLE' },
);

tasks = await fetchTasks(caseId);
assert(
  tasks.every((task) => task.status === 'AVAILABLE'),
  'all tasks are available after complete start evidence',
);

const template = await restSingle(
  'report_templates?select=id,name,version&is_active=eq.true&order=created_at.desc&limit=1',
);
const groups = await rest(
  `report_template_groups?select=*&template_id=eq.${template.id}&order=sort_order.asc`,
);
const items = await rest(
  `report_template_items?select=*&template_id=eq.${template.id}&order=sort_order.asc`,
);
const options = await rest(
  `report_template_item_options?select=*&template_id=eq.${template.id}&order=sort_order.asc`,
);
const inputs = await rest(
  `report_template_item_inputs?select=*&template_id=eq.${template.id}&order=sort_order.asc`,
);

assert(groups.length === 12, `template group count is 12, got ${groups.length}`);
assert(items.length === 265, `template item count is 265, got ${items.length}`);

const optionsByItem = groupBy(options, 'item_id');
const inputsByItem = groupBy(inputs, 'item_id');
const groupById = Object.fromEntries(groups.map((group) => [group.id, group]));

let answerCount = 0;
for (const item of items) {
  const itemOptions = optionsByItem[item.id] || [];
  const selected = selectDefaultOption(itemOptions);
  const itemInputs = inputsByItem[item.id] || [];
  await rpc('save_work_order_report_answer', {
    target_case_id: caseId,
    target_template_id: template.id,
    target_group_id: item.group_id,
    target_item_id: item.id,
    target_nokta_id: item.nokta_id,
    selected_option_ids: selected ? [selected.id] : [],
    selected_option_labels: selected ? [selected.label] : [],
    input_values: Object.fromEntries(
      itemInputs.map((input) => [input.id, sampleInputValue(input)]),
    ),
    description_text: `Live smoke ${groupById[item.group_id]?.title || ''}`,
    image_urls: [],
    answer_status: 'COMPLETED',
  });
  answerCount++;
}

const savedAnswers = await rest(
  `work_order_report_answers?select=id&expertise_case_id=eq.${caseId}`,
);
assert(answerCount === 265, `saved 265 answers, got ${answerCount}`);
assert(savedAnswers.length === 265, `live answer count is 265, got ${savedAnswers.length}`);

for (const task of tasks) {
  const claimed = await rpc('claim_inspection_task', {
    target_task_id: task.id,
  });
  assert(claimed.status === 'OPEN', `task ${task.title} claimed`);
  const submitted = await rpc('submit_inspection_task', {
    target_task_id: task.id,
  });
  assert(submitted.status === 'COMPLETED', `task ${task.title} submitted`);
}

tasks = await fetchTasks(caseId);
assert(
  tasks.every((task) => task.status === 'COMPLETED'),
  'all tasks completed after submit',
);

workOrder = await fetchWorkOrder(caseId);
assert(workOrder.status === 'MANAGER_REVIEW', `case status is ${workOrder.status}`);

const finalPayload = {
  smokeTest: true,
  workOrderNo: workOrder.work_order_no,
  plate,
  templateId: template.id,
  groups: groups.length,
  items: items.length,
  answers: answerCount,
  completedTasks: tasks.length,
  createdAt: new Date().toISOString(),
};

const finalReport = await post(
  'final_reports?on_conflict=expertise_case_id,revision_no',
  {
    expertise_case_id: caseId,
    template_id: template.id,
    revision_no: 1,
    payload: finalPayload,
    status: 'LOCKED',
    locked_at: new Date().toISOString(),
  },
  {
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
);

assert(finalReport.length === 1, 'final report row upserted');

console.log(
  JSON.stringify(
    {
      ok: true,
      caseId,
      workOrderNo: workOrder.work_order_no,
      plate,
      status: workOrder.status,
      tasks: tasks.length,
      answers: answerCount,
      finalReportStatus: finalReport[0].status,
      liveAnswerRows: savedAnswers.length,
    },
    null,
    2,
  ),
);

if (!keepSmokeData) {
  await cleanupSmokeCase(caseId);
  console.log(JSON.stringify({ cleanup: true, caseId }, null, 2));
}

async function signIn() {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function rpc(name, payload) {
  return post(`rpc/${name}`, payload);
}

async function rest(path, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { ...headers, ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function restSingle(path, extraHeaders = {}) {
  const rows = await rest(path, extraHeaders);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`GET ${path} returned no rows.`);
  }
  return rows[0];
}

async function post(path, payload, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...headers, ...extraHeaders },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function patch(path, payload) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`PATCH ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function del(path) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' },
  });
  if (!response.ok) {
    throw new Error(`DELETE ${path} failed: ${response.status} ${await response.text()}`);
  }
}

async function cleanupSmokeCase(caseId) {
  await del(`expertise_cases?id=eq.${caseId}`);
}

async function upsertStartEvidence(caseId, actorId, vin) {
  return post(
    'technician_start_evidence?on_conflict=expertise_case_id',
    {
      expertise_case_id: caseId,
      vin,
      vin_photo_url: 'smoke/vin.jpg',
      plate_photo_url: 'smoke/plate.jpg',
      odometer_km: 123456,
      odometer_photo_url: 'smoke/km.jpg',
      captured_at: new Date().toISOString(),
      captured_by: actorId,
      device_id: 'codex-live-smoke',
      gps_approx: 'test',
    },
    {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  );
}

async function fetchWorkOrder(caseId) {
  return restSingle(
    `expertise_cases?select=id,work_order_no,status,template_id,vehicles(plate,brand,model),package_plans(code,name)&id=eq.${caseId}`,
  );
}

async function fetchTasks(caseId) {
  return rest(
    `inspection_tasks?select=id,task_key,title,status,owner_user_id,assigned_role,report_field_key&expertise_case_id=eq.${caseId}&order=created_at.asc`,
  );
}

function groupBy(rows, key) {
  return rows.reduce((map, row) => {
    (map[row[key]] ||= []).push(row);
    return map;
  }, {});
}

function selectDefaultOption(options) {
  return (
    options.find((option) => option.disabled !== true && option.score_type === 'positive') ||
    options.find((option) => option.disabled !== true && option.color_type === 'green') ||
    options.find((option) => option.disabled !== true) ||
    null
  );
}

function sampleInputValue(input) {
  const text = `${input.label || ''} ${input.placeholder || ''} ${input.name || ''}`.toUpperCase();
  if (text.includes('MIKRON') || text.includes('MICRON')) return '160';
  if (input.type === 'number') return '1';
  if (input.type === 'checkbox') return 'true';
  if (text.includes('TARIH') || text.includes('TARİH')) return '2026-05-26';
  return 'Tamam';
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

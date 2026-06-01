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

const session = await signIn();
const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
};

const actor = await restSingle('app_users?select=id,full_name,role,branch_id&is_active=eq.true');
const beforeCases = await rest('expertise_cases?select=id,customer_id,vehicle_id,work_order_no,status');
const customerIds = uniqueIds(beforeCases.map((row) => row.customer_id));
const vehicleIds = uniqueIds(beforeCases.map((row) => row.vehicle_id));
const warnings = [];

for (const item of beforeCases) {
  await del(`expertise_cases?id=eq.${item.id}`);
}

await tryDeleteByIds('vehicles', vehicleIds, warnings);
await tryDeleteByIds('customers', customerIds, warnings);

const remainingCases = await rest('expertise_cases?select=id');
assert(remainingCases.length === 0, `visible expertise_cases should be empty after reset, got ${remainingCases.length}`);

const unique = Date.now().toString().slice(-6);
const plate = `16L${unique.slice(-4)}`;
const vin = `WVWZZZ3CZ${unique.padStart(6, '0')}`;

const caseId = await rpc('create_branch_work_order', {
  customer_full_name: `Mobil Canlı Test ${unique}`,
  customer_phone: `555${unique.slice(-7).padStart(7, '0')}`.slice(0, 10),
  customer_email: '',
  customer_identity_number: '',
  customer_role: 'Müşteri',
  vehicle_plate: plate,
  vehicle_vin: vin,
  vehicle_brand: 'Volkswagen',
  vehicle_model: 'Passat',
  vehicle_year: 2024,
  vehicle_fuel_type: 'Dizel',
  vehicle_transmission: 'Otomatik',
  vehicle_kilometers: 45210,
  vehicle_seller_type: 'Bireysel',
  vehicle_arrival_note: 'Codex tek canlı iş emri testi',
  package_type: 'PREMIUM',
  work_order_notes: 'Mobil APK canlı senkron testi için oluşturuldu.',
});

await upsertStartEvidence(caseId, actor.id, vin);
await patch(`expertise_cases?id=eq.${caseId}`, {
  status: 'TECHNICAL_ENTRY_OPEN',
  inspection_started_at: new Date().toISOString(),
});
await patch(
  `inspection_tasks?expertise_case_id=eq.${caseId}&owner_user_id=is.null&status=in.(LOCKED,ASSIGNED)`,
  { status: 'AVAILABLE' },
);

const createdCase = await fetchWorkOrder(caseId);
const tasks = await fetchTasks(caseId);
const finalCases = await rest('expertise_cases?select=id,work_order_no,status');
assert(finalCases.length === 1, `visible expertise_cases should contain exactly one row, got ${finalCases.length}`);
assert(tasks.length > 0, 'created work order should have inspection tasks');

console.log(
  JSON.stringify(
    {
      ok: true,
      reset: {
        deletedCases: beforeCases.length,
        remainingCases: finalCases.length,
        attemptedCustomerDeletes: customerIds.length,
        attemptedVehicleDeletes: vehicleIds.length,
      },
      created: {
        caseId,
        workOrderNo: createdCase.work_order_no,
        status: createdCase.status,
        plate,
        vehicle: `${createdCase.vehicles?.brand || 'Volkswagen'} ${createdCase.vehicles?.model || 'Passat'}`,
        package: createdCase.package_plans?.name || createdCase.package_plans?.code || 'PREMIUM',
        tasks: tasks.length,
        availableTasks: tasks.filter((task) => task.status === 'AVAILABLE').length,
      },
      warnings,
    },
    null,
    2,
  ),
);

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

async function tryDeleteByIds(table, ids, outputWarnings) {
  if (!ids.length) return;
  try {
    await del(`${table}?id=in.(${ids.join(',')})`);
  } catch (error) {
    outputWarnings.push(`${table} cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function upsertStartEvidence(caseId, actorId, vin) {
  return post(
    'technician_start_evidence?on_conflict=expertise_case_id',
    {
      expertise_case_id: caseId,
      vin,
      vin_photo_url: 'single-test/vin.jpg',
      plate_photo_url: 'single-test/plate.jpg',
      odometer_km: 45210,
      odometer_photo_url: 'single-test/km.jpg',
      captured_at: new Date().toISOString(),
      captured_by: actorId,
      device_id: 'codex-live-single-order',
      gps_approx: 'test',
    },
    {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  );
}

async function fetchWorkOrder(caseId) {
  return restSingle(
    `expertise_cases?select=id,work_order_no,status,vehicles(plate,brand,model),package_plans(code,name)&id=eq.${caseId}`,
  );
}

async function fetchTasks(caseId) {
  return rest(
    `inspection_tasks?select=id,task_key,title,status,owner_user_id,assigned_role,report_field_key&expertise_case_id=eq.${caseId}&order=created_at.asc`,
  );
}

function uniqueIds(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

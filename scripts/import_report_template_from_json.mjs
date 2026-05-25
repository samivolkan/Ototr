import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const sourcePath = args._[0];

if (!sourcePath) {
  console.error(
    'Usage: node scripts/import_report_template_from_json.mjs <json-path> [--dry-run] [--apply] [--force] [--sql-out docs/migrations/seed.sql]',
  );
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8'));
const normalized = normalize(source, {
  version: args.version || source.cekimZamani || 'v1',
});

printSummary(normalized);

if (args['sql-out']) {
  const outputPath = path.resolve(args['sql-out']);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, toSql(normalized), 'utf8');
  console.log(`SQL seed yazıldı: ${outputPath}`);
}

if (args.apply) {
  await applyToSupabase(normalized, { force: Boolean(args.force) });
} else if (!args['dry-run']) {
  console.log('Import uygulanmadı. Uygulamak için --apply, sadece kontrol için --dry-run kullanın.');
}

function normalize(root, { version }) {
  const groupsRaw = Array.isArray(root.gruplar) && root.gruplar.length
    ? root.gruplar
    : [...new Set((root.maddeler || []).map((item) => item.grupAdi))].map((grupAdi) => ({
        grupAdi,
      }));
  const itemsRaw = Array.isArray(root.maddeler) ? root.maddeler : [];
  const sourceReportId = String(root.raporID || root.raporId || 'unknown');
  const versionText = String(version || 'v1');
  const templateId = `otorapor_${slug(sourceReportId)}_${slug(versionText)}`;
  const groups = [];
  const items = [];
  const options = [];
  const inputs = [];
  const mediaFields = [];
  const missingOptionItems = [];

  const groupOrder = new Map();
  for (const [index, group] of groupsRaw.entries()) {
    const title = clean(group.grupAdi || group.grupAdiText || group.title || group.name || group);
    groupOrder.set(title, index + 1);
  }
  for (const item of itemsRaw) {
    const title = clean(item.grupAdi);
    if (!groupOrder.has(title)) {
      groupOrder.set(title, groupOrder.size + 1);
    }
  }

  for (const [title, sortOrder] of groupOrder.entries()) {
    groups.push({
      id: `${templateId}_grp_${slug(title)}`,
      template_id: templateId,
      title,
      code: groupCode(title),
      sort_order: sortOrder,
      point_info: '',
      assigned_role: assignedRole(groupCode(title)),
    });
  }
  const groupByTitle = new Map(groups.map((group) => [group.title, group]));

  for (const [index, rawItem] of itemsRaw.entries()) {
    const group = groupByTitle.get(clean(rawItem.grupAdi));
    if (!group) {
      continue;
    }
    const noktaId = Number(rawItem.noktaID || rawItem.noktaId || index + 1);
    const itemId = `${templateId}_item_${noktaId}`;
    const rawOptions = Array.isArray(rawItem.secenekler) ? rawItem.secenekler : [];
    const rawInputs = Array.isArray(rawItem.inputAlanlari) ? rawItem.inputAlanlari : [];
    const rawDescriptions = Array.isArray(rawItem.aciklamaAlanlari) ? rawItem.aciklamaAlanlari : [];
    const rawImages = Array.isArray(rawItem.resimAlanlari) ? rawItem.resimAlanlari : [];
    if (rawOptions.length === 0) {
      missingOptionItems.push({
        noktaId,
        title: clean(rawItem.maddeAdi || rawItem.modalBaslik),
        hasInputs: rawInputs.length > 0,
      });
    }
    items.push({
      id: itemId,
      template_id: templateId,
      group_id: group.id,
      nokta_id: noktaId,
      title: clean(rawItem.maddeAdi || rawItem.modalBaslik),
      modal_title: clean(rawItem.modalBaslik || rawItem.maddeAdi),
      sort_order: Number(rawItem.sira || index + 1),
      form_url: String(rawItem.formUrl || ''),
      item_type: itemType(rawOptions, rawInputs),
      has_options: rawOptions.length > 0,
      has_inputs: rawInputs.length > 0,
      has_description: rawDescriptions.length > 0,
      has_images: rawImages.length > 0,
      max_images: rawImages.length,
    });

    rawOptions.forEach((option, optionIndex) => {
      const secenekId = nullableNumber(option.secenekID || option.id || option.value);
      const colorType = colorTypeFromClass(option.className || option.class || '');
      options.push({
        id: `${itemId}_opt_${secenekId || optionIndex + 1}`,
        template_id: templateId,
        item_id: itemId,
        secenek_id: secenekId,
        label: clean(option.secenekAdi || option.label || option.value),
        sort_order: optionIndex + 1,
        input_name: String(option.inputName || 'Noktaradio'),
        class_name: String(option.className || ''),
        color_type: colorType,
        score_type: scoreTypeFromColor(colorType),
        is_default: option.checked === true || String(option.checked).toLowerCase() === 'true',
        disabled: option.disabled === true || String(option.disabled).toLowerCase() === 'true',
      });
    });

    rawInputs.forEach((input, inputIndex) => {
      inputs.push({
        id: `${itemId}_input_${inputIndex + 1}`,
        template_id: templateId,
        item_id: itemId,
        type: String(input.type || 'text').toLowerCase(),
        name: String(input.name || input.id || ''),
        label: clean(input.label || input.placeholder || input.name || ''),
        placeholder: clean(input.placeholder || ''),
        value: String(input.value ?? ''),
        sort_order: inputIndex + 1,
        is_required: input.required === true || String(input.required).toLowerCase() === 'true',
      });
    });

    rawImages.forEach((image, imageIndex) => {
      mediaFields.push({
        id: `${itemId}_media_${imageIndex + 1}`,
        template_id: templateId,
        item_id: itemId,
        label: clean(image.label || image.placeholder || image.name || `Fotoğraf ${imageIndex + 1}`),
        sort_order: imageIndex + 1,
        is_required: image.required === true || String(image.required).toLowerCase() === 'true',
      });
    });
  }

  return {
    template: {
      id: templateId,
      name: 'OTOTR Ekspertiz Rapor Şablonu',
      version: versionText,
      source_report_id: sourceReportId,
      is_active: true,
    },
    groups,
    items,
    options,
    inputs,
    mediaFields,
    missingOptionItems,
  };
}

async function applyToSupabase(payload, { force }) {
  const url = process.env.OTOTR_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.OTOTR_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('OTOTR_SUPABASE_URL ve OTOTR_SUPABASE_SERVICE_ROLE_KEY gerekli.');
  }

  const existing = await rest(url, key, `report_templates?id=eq.${encodeURIComponent(payload.template.id)}`);
  if (existing.length && !force) {
    console.log('Aynı sourceReportId/version daha önce import edilmiş. --force olmadan işlem yapılmadı.');
    return;
  }

  if (force && existing.length) {
    await rest(url, key, `report_templates?id=eq.${encodeURIComponent(payload.template.id)}`, {
      method: 'DELETE',
    });
  }

  await upsert(url, key, 'report_templates', [payload.template]);
  await upsert(url, key, 'report_template_groups', payload.groups);
  await upsert(url, key, 'report_template_items', payload.items);
  await upsert(url, key, 'report_template_item_options', payload.options);
  await upsert(url, key, 'report_template_item_inputs', payload.inputs);
  await upsert(url, key, 'report_template_item_media_fields', payload.mediaFields);
  console.log('Supabase import tamamlandı.');
}

async function upsert(url, key, table, rows) {
  if (!rows.length) {
    return;
  }
  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    await rest(url, key, `${table}?on_conflict=id`, {
      method: 'POST',
      body: JSON.stringify(rows.slice(index, index + chunkSize)),
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
    });
  }
}

async function rest(url, key, pathName, options = {}) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${pathName}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  if (response.status === 204) {
    return [];
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function toSql(payload) {
  const lines = [
    'begin;',
    `delete from public.report_templates where id = ${sql(payload.template.id)};`,
    insert('report_templates', [payload.template]),
    insert('report_template_groups', payload.groups),
    insert('report_template_items', payload.items),
    insert('report_template_item_options', payload.options),
    insert('report_template_item_inputs', payload.inputs),
    insert('report_template_item_media_fields', payload.mediaFields),
    'commit;',
    '',
  ];
  return lines.filter(Boolean).join('\n');
}

function insert(table, rows) {
  if (!rows.length) {
    return '';
  }
  const columns = Object.keys(rows[0]);
  const values = rows
    .map((row) => `(${columns.map((column) => sql(row[column])).join(', ')})`)
    .join(',\n');
  return `insert into public.${table} (${columns.join(', ')}) values\n${values}\non conflict (id) do update set ${columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')};`;
}

function printSummary(payload) {
  console.log(`Şablon: ${payload.template.id}`);
  console.log(`Toplam grup: ${payload.groups.length}`);
  console.log(`Toplam madde: ${payload.items.length}`);
  console.log(`Toplam seçenek: ${payload.options.length}`);
  console.log(`Toplam input field: ${payload.inputs.length}`);
  console.log(`Eksik/boş seçenekli madde: ${payload.missingOptionItems.length}`);
  for (const item of payload.missingOptionItems.slice(0, 12)) {
    console.log(`- ${item.noktaId}: ${item.title}${item.hasInputs ? ' (input var)' : ''}`);
  }
  if (payload.missingOptionItems.length > 12) {
    console.log(`... ${payload.missingOptionItems.length - 12} madde daha`);
  }
}

function parseArgs(values) {
  const out = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      out._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function itemType(options, inputs) {
  if (options.some((option) => String(option.inputName || '') === 'Noktacheckbox')) {
    return 'checkbox';
  }
  if (inputs.some((input) => String(input.type || '').toLowerCase() === 'checkbox')) {
    return options.length ? 'radio_with_checkbox' : 'checkbox';
  }
  if (options.length) {
    return inputs.length ? 'radio_with_input' : 'radio';
  }
  return inputs.length ? 'input' : 'description';
}

function colorTypeFromClass(className) {
  const value = String(className);
  if (value.includes('renk-yesil')) return 'green';
  if (value.includes('renk-kirmizi')) return 'red';
  if (value.includes('renk-turuncu')) return 'orange';
  if (value.includes('renk-gri')) return 'gray';
  return 'neutral';
}

function scoreTypeFromColor(colorType) {
  if (colorType === 'green') return 'positive';
  if (colorType === 'red') return 'negative';
  if (colorType === 'orange') return 'warning';
  return 'neutral';
}

function groupCode(title) {
  const normalized = clean(title).toLocaleUpperCase('tr-TR');
  if (normalized.includes('ARAÇ KABUL')) return 'WORK_ORDER_ACCEPTANCE';
  if (normalized.includes('DOSYA')) return 'VEHICLE_FILE_CHECK';
  if (normalized.includes('MOTOR')) return 'MOTOR_CHECKUP';
  if (normalized.includes('ALT') || normalized.includes('MEKANİK')) return 'MECHANICAL_CHECKUP';
  if (normalized.includes('KAPORTA')) return 'BODY_PAINT_CHECKUP';
  if (normalized.includes('OBD')) return 'OBD_ECU_TEST';
  if (normalized.includes('FREN')) return 'BRAKE_SUSPENSION_TEST';
  if (normalized.includes('DYNO')) return 'DYNO_ROAD_TEST';
  if (normalized.includes('DIŞ')) return 'EXTERIOR_CONDITION';
  if (normalized.includes('İÇ')) return 'INTERIOR_CHECKUP';
  if (normalized.includes('AIRBAG')) return 'AIRBAG_CHECK';
  if (normalized.includes('CONTA')) return 'HEAD_GASKET_LEAK_TEST';
  return slug(title).toUpperCase();
}

function assignedRole(code) {
  if (['WORK_ORDER_ACCEPTANCE', 'VEHICLE_FILE_CHECK'].includes(code)) return 'Sekreterya';
  if (['BODY_PAINT_CHECKUP', 'EXTERIOR_CONDITION', 'INTERIOR_CHECKUP'].includes(code)) {
    return 'Kaporta Ustası';
  }
  if (['MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'HEAD_GASKET_LEAK_TEST'].includes(code)) {
    return 'Mekanik Usta';
  }
  if (['OBD_ECU_TEST', 'AIRBAG_CHECK'].includes(code)) return 'OBD Ustası';
  if (['BRAKE_SUSPENSION_TEST', 'DYNO_ROAD_TEST'].includes(code)) return 'Test Operatörü';
  return 'Usta Havuzu';
}

function clean(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'value';
}

function nullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sql(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `array[${value.map((item) => sql(item)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return `${sql(JSON.stringify(value))}::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

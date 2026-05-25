CREATE TABLE IF NOT EXISTS inspection_groups (
  id text PRIMARY KEY,
  legacy_name text NOT NULL,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id text PRIMARY KEY,
  legacy_nokta_id integer UNIQUE NOT NULL,
  group_id text NOT NULL REFERENCES inspection_groups(id),
  group_code text NOT NULL,
  name text NOT NULL,
  input_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  requires_media boolean NOT NULL DEFAULT false,
  required_image_count integer NOT NULL DEFAULT 0,
  is_visible_in_report boolean NOT NULL DEFAULT true,
  is_technician_only boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  risk_category text NOT NULL,
  report_field_key text NOT NULL,
  package_availability jsonb NOT NULL,
  estimated_duration_seconds integer NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_options (
  id text PRIMARY KEY,
  legacy_option_id integer,
  legacy_nokta_id integer NOT NULL,
  item_id text NOT NULL REFERENCES inspection_items(id),
  label text NOT NULL,
  severity text NOT NULL,
  color text NOT NULL,
  score_impact integer NOT NULL DEFAULT 0,
  is_negative boolean NOT NULL DEFAULT false,
  requires_description boolean NOT NULL DEFAULT false,
  requires_media boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_input_fields (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES inspection_items(id),
  legacy_nokta_id integer NOT NULL,
  field_name text NOT NULL,
  type text NOT NULL,
  label text NOT NULL,
  placeholder text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  unit text NOT NULL DEFAULT '',
  validation jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS inspection_media_requirements (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES inspection_items(id),
  legacy_nokta_id integer NOT NULL,
  max_images integer NOT NULL DEFAULT 3,
  allowed_mime_types jsonb NOT NULL,
  required_image_count integer NOT NULL DEFAULT 0,
  requires_media_when_severity jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_rules (
  id text PRIMARY KEY,
  title text NOT NULL,
  rule jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id text NOT NULL,
  package_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz
);

CREATE TABLE IF NOT EXISTS inspection_report_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES inspection_reports(id),
  item_id text NOT NULL REFERENCES inspection_items(id),
  option_id text REFERENCES inspection_options(id),
  value text,
  note text,
  severity text,
  report_field_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_report_answer_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES inspection_report_answers(id),
  field_key text NOT NULL,
  local_path text,
  remote_url text,
  hash text,
  captured_at timestamptz,
  uploaded_at timestamptz,
  uploaded_by text
);

-- OTOTR ERP + CRM core schema draft

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  branch_id TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL,
  manager TEXT NOT NULL,
  revenue INTEGER NOT NULL DEFAULT 0,
  royalty INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  nps INTEGER NOT NULL DEFAULT 0,
  google_score REAL NOT NULL DEFAULT 0,
  google_review_url TEXT,
  quality_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL,
  growth_rate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE branch_metrics (
  branch_id TEXT PRIMARY KEY REFERENCES branches(id),
  capacity INTEGER NOT NULL,
  average_ticket INTEGER NOT NULL,
  premium_conversion INTEGER NOT NULL,
  average_wait TEXT NOT NULL,
  sla INTEGER NOT NULL,
  complaints INTEGER NOT NULL,
  staff_count INTEGER NOT NULL,
  training_completion INTEGER NOT NULL,
  inventory_status TEXT NOT NULL,
  profit INTEGER NOT NULL
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  type TEXT NOT NULL,
  stage TEXT NOT NULL,
  score INTEGER NOT NULL,
  budget TEXT,
  source TEXT,
  owner TEXT,
  next_step TEXT,
  phone TEXT
);

CREATE TABLE lead_scores (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id),
  finance INTEGER NOT NULL,
  character_score INTEGER NOT NULL,
  location INTEGER NOT NULL,
  brand_fit INTEGER NOT NULL,
  closing_probability INTEGER NOT NULL,
  investment TEXT,
  district TEXT
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  city TEXT NOT NULL,
  segment TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  nps INTEGER NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  next_action TEXT
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  branch_id TEXT REFERENCES branches(id),
  time TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  package TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  branch_id TEXT REFERENCES branches(id),
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  score REAL NOT NULL,
  result TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  estimated_price INTEGER NOT NULL,
  expert TEXT NOT NULL
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  customer_id TEXT REFERENCES customers(id),
  last_report_id TEXT REFERENCES reports(id),
  risk_level TEXT NOT NULL,
  repeat_warning TEXT
);

CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  productivity INTEGER NOT NULL,
  vehicles_today INTEGER NOT NULL,
  error_rate REAL NOT NULL,
  nps REAL NOT NULL,
  attendance INTEGER NOT NULL,
  bonus INTEGER NOT NULL
);

CREATE TABLE operations (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id),
  vehicle TEXT NOT NULL,
  station TEXT NOT NULL,
  expert TEXT NOT NULL,
  started_at TEXT NOT NULL,
  eta TEXT NOT NULL,
  status TEXT NOT NULL,
  delay_risk TEXT NOT NULL
);

CREATE TABLE marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  spend INTEGER NOT NULL,
  leads INTEGER NOT NULL,
  appointments INTEGER NOT NULL,
  sales INTEGER NOT NULL,
  cpl INTEGER NOT NULL,
  roas REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE legal_cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  risk TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT,
  exposure INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE training_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT NOT NULL,
  completion INTEGER NOT NULL,
  pass_rate INTEGER NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE complaints (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  branch_id TEXT REFERENCES branches(id),
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  stage TEXT NOT NULL,
  owner TEXT NOT NULL,
  regional_owner TEXT,
  created_at TEXT NOT NULL,
  first_response_minutes INTEGER NOT NULL DEFAULT 0,
  resolution_hours INTEGER NOT NULL DEFAULT 0,
  sla_status TEXT NOT NULL,
  reopened INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  requested_action TEXT,
  reputation_risk INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE complaint_messages (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES complaints(id),
  author TEXT NOT NULL,
  channel TEXT NOT NULL,
  visibility TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE complaint_actions (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES complaints(id),
  action TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT
);

CREATE TABLE complaint_satisfaction (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES complaints(id),
  stars INTEGER NOT NULL,
  nps INTEGER NOT NULL,
  comment TEXT
);

CREATE TABLE google_reviews (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id),
  customer_id TEXT REFERENCES customers(id),
  complaint_id TEXT REFERENCES complaints(id),
  reviewer TEXT NOT NULL,
  rating INTEGER NOT NULL,
  previous_rating INTEGER,
  status TEXT NOT NULL,
  review_date TEXT NOT NULL,
  response_minutes INTEGER NOT NULL DEFAULT 0,
  text TEXT
);

CREATE TABLE review_changes (
  id TEXT PRIMARY KEY,
  review_id TEXT REFERENCES google_reviews(id),
  branch_id TEXT REFERENCES branches(id),
  from_rating INTEGER,
  to_rating INTEGER,
  change_type TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE TABLE review_recovery_rewards (
  id TEXT PRIMARY KEY,
  review_id TEXT REFERENCES google_reviews(id),
  branch_id TEXT REFERENCES branches(id),
  from_rating INTEGER NOT NULL,
  to_rating INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  reward_status TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE whatsapp_conversations (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  lead_id TEXT REFERENCES leads(id),
  branch_id TEXT REFERENCES branches(id),
  owner TEXT NOT NULL,
  team TEXT NOT NULL,
  stage TEXT NOT NULL,
  tags TEXT,
  first_reply_minutes INTEGER NOT NULL DEFAULT 0,
  messages_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  last_message_at TEXT,
  lost_reason TEXT
);

CREATE TABLE whatsapp_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES whatsapp_conversations(id),
  direction TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE whatsapp_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  use_case TEXT NOT NULL,
  status TEXT NOT NULL,
  avg_conversion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE reputation_scores (
  branch_id TEXT PRIMARY KEY REFERENCES branches(id),
  official_review_url TEXT NOT NULL,
  average_rating REAL NOT NULL,
  total_reviews INTEGER NOT NULL,
  new_reviews INTEGER NOT NULL,
  negative_reviews INTEGER NOT NULL,
  updated_reviews INTEGER NOT NULL,
  deleted_reviews INTEGER NOT NULL,
  response_speed_minutes INTEGER NOT NULL,
  recovery_count INTEGER NOT NULL,
  reviews_growth REAL NOT NULL,
  positive_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL
);

CREATE TABLE executive_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  severity TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold TEXT NOT NULL,
  message TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT,
  evidence TEXT
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

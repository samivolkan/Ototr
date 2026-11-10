-- OTOTR / BigQuery ML reference pipeline. Replace `project.erp_ml` before use.
CREATE OR REPLACE MODEL `project.erp_ml.branch_risk_30d`
OPTIONS(
  MODEL_TYPE='BOOSTED_TREE_CLASSIFIER',
  INPUT_LABEL_COLS=['became_risky_30d'],
  DATA_SPLIT_METHOD='SEQ',
  DATA_SPLIT_COL='snapshot_date',
  MAX_ITERATIONS=50,
  ENABLE_GLOBAL_EXPLAIN=TRUE
) AS
SELECT snapshot_date, operations_score, customer_score, reputation_score, quality_score,
       finance_score, people_score, legal_score, growth_score, data_coverage,
       became_risky_30d
FROM `project.erp_ml.branch_health_training`
WHERE data_coverage >= 70 AND snapshot_date < DATE_SUB(CURRENT_DATE('Europe/Istanbul'), INTERVAL 30 DAY);

CREATE OR REPLACE TABLE `project.erp_ml.branch_risk_predictions` AS
SELECT branch_id, CURRENT_DATE('Europe/Istanbul') prediction_date,
  predicted_became_risky_30d_probs[OFFSET(1)].prob risk_probability,
  CURRENT_TIMESTAMP() generated_at
FROM ML.PREDICT(MODEL `project.erp_ml.branch_risk_30d`,
  (SELECT * EXCEPT(became_risky_30d) FROM `project.erp_ml.branch_health_scoring`));

-- Explanations are persisted next to each prediction and shown in ERP.
SELECT * FROM ML.EXPLAIN_PREDICT(MODEL `project.erp_ml.branch_risk_30d`,
  (SELECT * EXCEPT(became_risky_30d) FROM `project.erp_ml.branch_health_scoring`),
  STRUCT(5 AS top_k_features));

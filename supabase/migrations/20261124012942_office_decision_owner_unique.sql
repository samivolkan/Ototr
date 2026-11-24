-- A decision owner cannot reset capacity/accounting by opening a second workspace desk.
alter table app_private.office_decision_desks add constraint office_decision_desks_owner_unique unique(owner_id);

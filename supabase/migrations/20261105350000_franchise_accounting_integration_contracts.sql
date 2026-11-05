insert into public.franchise_integration_event_contracts(source,event_type,contract_version,required_payload_keys,allowed_payload_keys) values
('accounting','chart_of_accounts.created',1,array['branch_id','chart_reference'],array['branch_id','chart_reference']),
('accounting','current_account.created',1,array['branch_id','current_account_id'],array['branch_id','current_account_id']),
('accounting','opening_balance.reconciled',1,array['branch_id','reconciliation_id'],array['branch_id','reconciliation_id','period_reference'])
on conflict(source,event_type,contract_version) do update set required_payload_keys=excluded.required_payload_keys,allowed_payload_keys=excluded.allowed_payload_keys,is_active=true;

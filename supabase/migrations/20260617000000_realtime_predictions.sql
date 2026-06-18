-- Enable Supabase Realtime for predictions so the frontend can live-update when
-- the ingestion cron writes new picks. RLS still governs which rows each client
-- actually receives.
alter publication supabase_realtime add table predictions;

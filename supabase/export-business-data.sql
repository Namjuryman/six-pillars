-- Read-only export for the owner-approved personal data project.
-- Run through an authorized SQL tool; download privately, never commit the result.
-- One SQL statement preserves a consistent snapshot across all five business tables.
select jsonb_build_object(
  'format', 'six-pillars-private', 'schemaVersion', 1,
  'exportedAt', now(), 'timezone', 'Asia/Hong_Kong',
  'projectRef', 'rplgwjhnptappdbwqygj',
  'migrations', jsonb_build_array('20261015063209','20261015063307'),
  'data', jsonb_build_object(
    'goals', coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.goals t),'[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.projects t),'[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.milestones t),'[]'::jsonb),
    'activity_logs', coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.activity_logs t),'[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(t) order by id) from public.achievements t),'[]'::jsonb)
  )
) as backup;

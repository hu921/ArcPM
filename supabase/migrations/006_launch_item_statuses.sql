-- ArcPM: launch checklist statuses → ongoing / blocked / closed
-- Safe to re-run

update launch_items
set status = case status
  when 'go' then 'closed'
  when 'nogo' then 'blocked'
  when 'watch' then 'ongoing'
  when 'closed' then 'closed'
  when 'blocked' then 'blocked'
  when 'ongoing' then 'ongoing'
  else 'ongoing'
end
where status in ('go', 'watch', 'nogo', 'closed', 'blocked', 'ongoing')
   or status is null;

alter table launch_items alter column status set default 'ongoing';

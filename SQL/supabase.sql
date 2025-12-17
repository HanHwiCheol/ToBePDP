SELECT 'As-Is' AS system_type, step, action, to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') AS created_at_kst, user_email
FROM app.usage_events order by created_at asc;


delete from app.usage_events;
delete from app.treetables;
delete from app.treetable_nodes;


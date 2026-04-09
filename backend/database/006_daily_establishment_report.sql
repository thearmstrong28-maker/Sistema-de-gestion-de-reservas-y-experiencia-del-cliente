CREATE OR REPLACE VIEW daily_establishment_report AS
SELECT
  r.reservation_date AS report_date,
  COUNT(*) AS reservations_count,
  COUNT(*) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) AS attended_count,
  COUNT(DISTINCT r.customer_id) AS customer_count,
  COUNT(*) FILTER (WHERE r.status = 'NO_SHOW') AS no_show_count
FROM reservations r
GROUP BY r.reservation_date;

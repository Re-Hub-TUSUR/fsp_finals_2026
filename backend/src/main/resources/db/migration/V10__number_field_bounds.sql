-- V10__number_field_bounds.sql
-- Числовые поля шаблонов получают границы: расстояние, количество команд/игроков и длительность
-- не бывают отрицательными (сервер дополнительно применяет min = 0 ко всем NUMBER-полям).
-- Формат: {"min":..., "max":..., "integer":true} внутри описания поля.

UPDATE event_templates t
SET fields = (
    SELECT COALESCE(jsonb_agg(
        CASE f ->> 'key'
            WHEN 'distanceKm'    THEN f || '{"min": 0.1, "max": 1000}'::jsonb
            WHEN 'teamsCount'    THEN f || '{"min": 1, "max": 100, "integer": true}'::jsonb
            WHEN 'teamSize'      THEN f || '{"min": 1, "max": 100, "integer": true}'::jsonb
            WHEN 'matchDuration' THEN f || '{"min": 1, "max": 600}'::jsonb
            WHEN 'cutoff'        THEN f || '{"min": 1, "max": 1440}'::jsonb
            ELSE f
        END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(t.fields) WITH ORDINALITY AS e(f, ord)
)
WHERE jsonb_typeof(t.fields) = 'array';

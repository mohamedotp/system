-- ====================================================
-- Migration: Add IS_MANUAL column to SYSTEM_NOTIFICATIONS
-- Purpose: Distinguish manual (user-sent) notifications from
--          automatic system notifications (e.g. "وصلتك مذكرة")
-- Run on: SALARY schema (primary) and DOC schema (fallback)
-- ====================================================

-- Run this on SALARY schema first:
ALTER TABLE SALARY.SYSTEM_NOTIFICATIONS ADD IS_MANUAL NUMBER(1) DEFAULT 0;

-- If you need to run it on the DOC schema separately:
-- ALTER TABLE SYSTEM_NOTIFICATIONS ADD IS_MANUAL NUMBER(1) DEFAULT 0;

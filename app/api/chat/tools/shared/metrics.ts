import { sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/**
 * Safe percentage rounded to 1 decimal place.
 * Returns 0 when denominator is 0.
 */
export function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? +((numerator / denominator) * 100).toFixed(1) : 0;
}

/**
 * SQL SUM(CASE …) expression that collapses Replied / Continued / Stopped
 * outreach statuses into a single "replied" count.
 * Use in SELECT clauses.
 */
export const repliedCountExpr = (statusField: AnyColumn) =>
  sql<number>`SUM(CASE WHEN ${statusField} IN ('Replied', 'Continued', 'Stopped') THEN 1 ELSE 0 END)`;

/**
 * Same expression cast to float and divided by NULLIF(COUNT(*), 0).
 * Use in ORDER BY clauses to sort by reply rate.
 */
export const repliedRateExpr = (statusField: AnyColumn) =>
  sql<number>`SUM(CASE WHEN ${statusField} IN ('Replied', 'Continued', 'Stopped') THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)`;

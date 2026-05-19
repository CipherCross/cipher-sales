import { gte, lte } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

/**
 * Builds gte/lte conditions for PostgreSQL `date` columns.
 * Values are compared as plain ISO date strings.
 */
export function stringDateRange(
  field: AnyColumn,
  startDate: string | undefined,
  endDate: string | undefined,
): SQL[] {
  const conds: SQL[] = [];
  if (startDate) conds.push(gte(field, startDate));
  if (endDate) conds.push(lte(field, endDate));
  return conds;
}

/**
 * Builds gte/lte conditions for PostgreSQL `timestamp` columns.
 * Converts ISO date strings to Date objects; end date is padded to 23:59:59
 * so the whole day is included.
 */
export function timestampDateRange(
  field: AnyColumn,
  startDate: string | undefined,
  endDate: string | undefined,
): SQL[] {
  const conds: SQL[] = [];
  if (startDate) conds.push(gte(field, new Date(startDate)));
  if (endDate) conds.push(lte(field, new Date(endDate + "T23:59:59")));
  return conds;
}

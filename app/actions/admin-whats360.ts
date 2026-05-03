'use server';

/**
 * Sprint 12 — admin-only Whats360 device-status probe.
 *
 * Per ADR-063 the Whats360 device runs on the sales line `+201116527773`,
 * making the device a single point of failure for sales + OTP + order
 * notifications. The dashboard widget polls this action every 60 s so the
 * owner sees a "device disconnected" state within ~1 minute of the QR
 * dropping. Action is gated to OWNER + OPS via the dashboard role matrix.
 */
import { requireAdmin } from '@/lib/auth';
import { canSeeWidget } from '@/lib/admin/role-matrix';
import { getDeviceStatus, type Whats360DeviceStatus } from '@/lib/whatsapp';

export type Whats360StatusResult =
  | { ok: true; status: Whats360DeviceStatus; checkedAt: string }
  | { ok: false; errorKey: 'forbidden' };

export async function getWhats360DeviceStatusAction(): Promise<Whats360StatusResult> {
  const user = await requireAdmin();
  if (!canSeeWidget(user.adminRole ?? null, 'whats360Status')) {
    return { ok: false, errorKey: 'forbidden' };
  }
  const status = await getDeviceStatus();
  return { ok: true, status, checkedAt: new Date().toISOString() };
}

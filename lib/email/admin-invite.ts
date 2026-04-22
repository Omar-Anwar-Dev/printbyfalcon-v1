import { escapeHtml } from '@/lib/utils';
import type { AdminRole } from '@prisma/client';

type Input = {
  inviterName: string;
  role: AdminRole;
  acceptUrl: string;
  expiresInHours: number;
  locale: 'ar' | 'en';
};

export type AdminInviteEmail = {
  subject: string;
  text: string;
  html: string;
};

const ROLE_LABEL_AR: Record<AdminRole, string> = {
  OWNER: 'مالك (Owner)',
  OPS: 'عمليات (Ops)',
  SALES_REP: 'مندوب مبيعات (Sales Rep)',
};

const ROLE_LABEL_EN: Record<AdminRole, string> = {
  OWNER: 'Owner',
  OPS: 'Ops',
  SALES_REP: 'Sales Rep',
};

export function renderAdminInviteEmail(input: Input): AdminInviteEmail {
  return input.locale === 'ar' ? renderAr(input) : renderEn(input);
}

function renderAr(input: Input): AdminInviteEmail {
  const roleLabel = ROLE_LABEL_AR[input.role];
  const subject = 'دعوة للانضمام إلى لوحة إدارة Print By Falcon';
  const text = [
    `أهلًا،`,
    '',
    `${input.inviterName} دعاك للانضمام إلى لوحة إدارة Print By Falcon كـ "${roleLabel}".`,
    '',
    `اضغط الرابط التالي لتعيين كلمة مرور وإتمام التفعيل (صالح لمدة ${input.expiresInHours} ساعة):`,
    input.acceptUrl,
    '',
    'لو لم تتوقع هذه الدعوة، تجاهل هذه الرسالة.',
    '',
    'فريق Print By Falcon',
  ].join('\n');

  const html = `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.7">
    <p>أهلًا،</p>
    <p><strong>${escapeHtml(input.inviterName)}</strong> دعاك للانضمام إلى لوحة إدارة Print By Falcon كـ <strong>${escapeHtml(roleLabel)}</strong>.</p>
    <p>اضغط الزر التالي لتعيين كلمة مرور وإتمام التفعيل (صالح لمدة ${input.expiresInHours} ساعة):</p>
    <p><a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">قبول الدعوة</a></p>
    <p style="color:#64748b;font-size:13px">لو لم تتوقع هذه الدعوة، تجاهل هذه الرسالة.</p>
    <p style="color:#64748b;font-size:13px">فريق Print By Falcon</p>
  </div>`;

  return { subject, text, html };
}

function renderEn(input: Input): AdminInviteEmail {
  const roleLabel = ROLE_LABEL_EN[input.role];
  const subject = 'You are invited to the Print By Falcon admin panel';
  const text = [
    `Hi,`,
    '',
    `${input.inviterName} has invited you to the Print By Falcon admin panel as "${roleLabel}".`,
    '',
    `Click the link below to set your password and activate your account (valid for ${input.expiresInHours} hours):`,
    input.acceptUrl,
    '',
    "Didn't expect this? Just ignore this email.",
    '',
    'Print By Falcon',
  ].join('\n');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
    <p>Hi,</p>
    <p><strong>${escapeHtml(input.inviterName)}</strong> has invited you to the Print By Falcon admin panel as <strong>${escapeHtml(roleLabel)}</strong>.</p>
    <p>Click the button below to set your password and activate your account (valid for ${input.expiresInHours} hours):</p>
    <p><a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Accept invitation</a></p>
    <p style="color:#64748b;font-size:13px">Didn't expect this? Just ignore this email.</p>
    <p style="color:#64748b;font-size:13px">Print By Falcon</p>
  </div>`;

  return { subject, text, html };
}

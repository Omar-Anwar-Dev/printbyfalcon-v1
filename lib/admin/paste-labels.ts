/**
 * Sprint 16 — bilingual labels for the JSON-paste quick-fill panel. Lives
 * outside the i18n catalogs because the panel is admin-only and these strings
 * are short enough that an inline AR/EN switch is simpler than threading new
 * keys through messages/ar.json + messages/en.json.
 */
import type { PasteLabels } from '@/components/admin/product-json-paste';

export function buildPasteLabels(isAr: boolean): PasteLabels {
  return isAr
    ? {
        title: 'إدخال سريع بـ JSON',
        hint: 'الصق JSON من ChatGPT لملء كل الحقول دفعة واحدة. مش بيحفظ — بتراجع وبتضغط حفظ بنفسك. الصور والتوافق هتفضل بإيدك.',
        showHide: 'إظهار',
        hide: 'إخفاء',
        textareaPlaceholder: 'الصق هنا الـ JSON...',
        apply: 'املأ الفورم',
        copyPrompt: 'انسخ Prompt لـ ChatGPT',
        copied: 'تم النسخ ✓',
        paste: 'لصق من الحافظة',
        clear: 'مسح',
        appliedFieldsHeader: 'تم ملء:',
        errorsHeader: 'مشاكل:',
        schemaHeader: 'Schema',
      }
    : {
        title: 'Quick-fill via JSON',
        hint: 'Paste JSON (e.g. from ChatGPT) to populate every form field at once. This does not save — review, tweak, then click Save. Images + compatibility stay manual.',
        showHide: 'Show',
        hide: 'Hide',
        textareaPlaceholder: 'Paste JSON here...',
        apply: 'Fill form',
        copyPrompt: 'Copy ChatGPT prompt',
        copied: 'Copied ✓',
        paste: 'Paste from clipboard',
        clear: 'Clear',
        appliedFieldsHeader: 'Applied:',
        errorsHeader: 'Issues:',
        schemaHeader: 'Schema',
      };
}

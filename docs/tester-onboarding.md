# M1 Closed-Beta Tester Onboarding Kit

**Audience:** the 5 friendly B2C testers + 3 friendly B2B companies you personally invite for the M1 soft launch (S12-D1-T3 / S12-D2-T1).

**Posture:** M1 launches **COD-only** (Paymob is still in merchant review per ADR-064). Set this expectation up front in your outreach so testers don't go looking for a card option. When Paymob approval lands you flip `PAYMENTS_PAYMOB_ENABLED=true` in `.env.production` + redeploy — no announcement needed for closed-beta cohort, just mention it casually in the WhatsApp group.

---

## 1. Outreach checklist

For each tester, before sending the welcome message:

- [ ] You've personally spoken to them (call or WhatsApp) and they've agreed to test.
- [ ] You have their preferred WhatsApp number (the same one will receive OTPs + order updates).
- [ ] **B2B only:** their commercial registry + tax card numbers are in hand.
- [ ] You've added them to the dedicated **"Print By Falcon — Beta Testers"** WhatsApp group.

When all 8 are added, post a single welcome message in the group naming the support contact (you, on `+201116527773`) and pinning this onboarding kit (link).

---

## 2. B2C welcome message (copy-paste)

### Arabic (default)

```
أهلاً [الاسم]! 👋

شكرًا إنك وافقت تكون من أول مختبري Print By Falcon قبل الإطلاق العام.

🛒 المتجر: https://printbyfalcon.com
💬 دعم فني / استفسارات: واتساب +20 111 652 7773
📝 صفحة الملاحظات: https://printbyfalcon.com/ar/feedback

ملاحظات سريعة قبل ما تبدأ:
• التسجيل بالموبايل (هيوصلك OTP عبر واتساب).
• حاليًا متاح "الدفع عند الاستلام" فقط — الدفع بالبطاقة هيتفعل قريبًا.
• الشحن لكل محافظات مصر، 1-5 أيام عمل.
• لو لقيت أي مشكلة: ابعت لي مباشرة هنا، أو من صفحة الملاحظات اللي فوق.

أهلاً بيك في المرحلة التجريبية! 🚀
```

### English

```
Hi [Name]! 👋

Thanks for agreeing to be one of the first testers of Print By Falcon ahead of the public launch.

🛒 Store: https://printbyfalcon.com/en
💬 Support / questions: WhatsApp +20 111 652 7773
📝 Feedback page: https://printbyfalcon.com/en/feedback

A few notes before you start:
• Sign in with your mobile number (OTP arrives via WhatsApp).
• Cash on delivery only for now — card payment switches on once Paymob approves us.
• We ship across all Egyptian governorates in 1-5 business days.
• Bumped into something off? Message me here or use the feedback page above.

Welcome to the closed beta! 🚀
```

---

## 3. B2B welcome message (copy-paste)

### Arabic (default)

```
أهلاً [اسم الشركة] 🏢

شكرًا إنكم اخترتم تكونوا من أوائل عملاء Print By Falcon B2B.

🛒 المتجر: https://printbyfalcon.com
🔐 تسجيل دخول الشركات: https://printbyfalcon.com/ar/b2b/login
💬 دعم: واتساب +20 111 652 7773
📝 صفحة الملاحظات: https://printbyfalcon.com/ar/feedback

تفاصيل التسجيل:
• اسم المستخدم: البريد الإلكتروني اللي قدّمتم به.
• كلمة المرور المؤقتة: [PASSWORD] — هتتطلب تغييرها في أول دخول.
• درجة التسعير المعتمدة: [TIER A / B / C] — هتلاقوها مطبّقة تلقائيًا في كل المنتجات.
• حد الائتمان: [CREDIT_LIMIT_EGP] ج.م

ملاحظات سريعة:
• حاليًا الدفع متاح: "الدفع عند الاستلام" + "إرسال للمراجعة" (مع ائتمان).
• الدفع بالبطاقة هيتفعل قريبًا بعد موافقة Paymob.
• مندوب المبيعات [SALES_REP_NAME] هيتواصل معاكم في خلال 24 ساعة من أي طلب "بانتظار التأكيد".
• ابعتوا أي ملاحظة على الواتساب أو من صفحة الملاحظات.

أهلاً بيكم في المرحلة التجريبية. 🚀
```

### English

```
Hello [Company name] 🏢

Thanks for choosing to be one of the first B2B customers of Print By Falcon.

🛒 Store: https://printbyfalcon.com/en
🔐 Business sign-in: https://printbyfalcon.com/en/b2b/login
💬 Support: WhatsApp +20 111 652 7773
📝 Feedback page: https://printbyfalcon.com/en/feedback

Sign-in details:
• Username: the email you applied with.
• Temporary password: [PASSWORD] — you'll be asked to change it at first login.
• Approved pricing tier: [TIER A / B / C] — applied automatically across the catalog.
• Credit limit: [CREDIT_LIMIT_EGP] EGP

A few notes:
• Available payment for now: cash on delivery + Submit-for-Review (credit terms).
• Card payment switches on once Paymob approves us.
• Your sales rep [SALES_REP_NAME] will reach out within 24h of any "Pending Confirmation" order you submit.
• Send any feedback on WhatsApp or via the feedback page.

Welcome to the closed beta. 🚀
```

---

## 4. What you (the owner) do for each tester

### B2C tester onboarding (S12-D1-T3)

1. **Send the welcome message** above on the personal WhatsApp number (NOT the group — they're personal).
2. **Watch the OTP send** in `/admin/feedback` and `/admin/orders` for their first attempt — confirm OTP arrives within 60 seconds.
3. **Place a real test order yourself** with a small SKU + a real address — confirm the COD flow lands an order in `/admin/orders` and a WhatsApp confirmation arrives at the customer phone.
4. **Add them to the WhatsApp group** with a short pin: "Welcome [Name] — feedback page is `/ar/feedback` or just message here."

### B2B tester onboarding (S12-D2-T1)

1. **Approve the application** in `/admin/b2b/applications` (the company has already submitted the signup form per the kit).
2. **Set the pricing tier** + credit terms on the company in `/admin/b2b/companies` — owner decides A/B/C and credit limit.
3. **Create the company login** in `/admin/users` (B2B users are admin-created, NOT self-service per ADR-007). Note the temp password.
4. **Send the B2B welcome** above with the temp password.
5. **Verify in /admin** the company's first sign-in succeeds (look for the `lastLoginAt` timestamp on `/admin/b2b/companies/[id]`).

---

## 5. Day-by-day support cadence (S12-D2-T2)

Pin this in your daily routine for the soft-launch window:

**Morning (~09:30 Cairo)**
1. Open `/admin` — check the dashboard. Whats360 widget should be green; if red/amber, open the WhatsApp QR scanner page on the device phone immediately.
2. Open `/admin/feedback?status=NEW` — triage anything that came in overnight.
3. Open `/admin/orders` — confirm any new orders are in `CONFIRMED` (not stuck in `PENDING`).
4. Open https://glitchtip.printbyfalcon.com (or your GlitchTip URL) — eyeball the error rate; resolve any new groups.

**Afternoon (~16:00)**
1. Same as morning, plus: respond to any tester WhatsApp messages.
2. If a bug needs a code fix: open a new branch via `/project-executor` and push as soon as ready.

**Evening (~21:00)**
1. Final feedback sweep + WhatsApp message reply pass.
2. If you fixed any bugs today, mark the related feedback items as `ACTIONED` in `/admin/feedback`.

See [docs/daily-monitoring.md](daily-monitoring.md) for the full ops playbook.

---

## 6. Tester data tracking (lightweight)

Keep a single Google Sheet or shared note with one row per tester:

| Tester | Type | Onboarded | First order | First feedback | Notes |
|---|---|---|---|---|---|
| Tester 1 | B2C | 2026-05-04 | 2026-05-05 | 2026-05-05 | "Promo code suggestion" |
| Tester 2 | B2C | … | … | … | … |
| Co. A | B2B | … | … | … | … |
| Co. B | B2B | … | … | … | … |

This becomes the input for the M1 retro on Sprint 12 D10.

---

## 7. End of beta — what to tell testers at M1 close

Once Sprint 12 D10 closes M1:

```
شكرًا [الاسم]! 🎉

النسخة v1.0 من Print By Falcon اتطلقت رسميًا اليوم بفضل ملاحظاتك.

تقدر تكمل تستخدم المتجر زي ما إنت — الحساب بقى دائم. لو فيه أي feedback لسه عندك أو أي مشكلة، استمر تبعتلي على نفس الواتساب.

كل عميل من أوائل المختبرين هياخد كود خصم 10% (TESTER10) صالح لمدة 30 يوم — شكرًا لمساعدتك. 💙
```

(Adjust the discount code per your promo strategy; create the code in `/admin/settings/promo-codes` first.)

---

## 8. When Paymob switches on (post-M1)

When you get the Paymob merchant approval email:

1. Set live keys in `.env.production` (PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID_CARD, PAYMOB_INTEGRATION_ID_FAWRY, PAYMOB_HMAC_SECRET, PAYMOB_IFRAME_ID).
2. Set `PAYMENTS_PAYMOB_ENABLED=true` (or remove the line — default is enabled).
3. Trigger a production deploy via GitHub Actions.
4. Place ONE test card payment with one real product → refund immediately.
5. Verify webhook signature validates (check GlitchTip + `/admin/orders/[id]`).
6. Post a casual update in the beta WhatsApp group: "تم تفعيل الدفع بالبطاقة 💳 تقدروا تستخدموه من النهاردة."

This is the single biggest in-place change between M1 and the M2 public launch.

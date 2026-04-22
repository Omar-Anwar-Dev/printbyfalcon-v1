# Audit Log — Dev Query Cheatsheet

Sprint 10 deliverable (S10-D8-T2, also closes Sprint 8 + 9 parking-lot items).

The `AuditLog` table captures every state-changing admin action. A UI viewer is deferred to v1.1 — for MVP, ops/owner runs SQL directly against the prod DB or reads the Prisma-studio view.

---

## Table shape

```sql
-- AuditLog schema (prisma/schema.prisma)
id          TEXT PRIMARY KEY
actorId     TEXT       -- User.id of whoever performed the action
action      TEXT       -- dotted verb: entity.verb, e.g. "b2b.company.override.update"
entityType  TEXT       -- "Order" | "Product" | "User" | ...
entityId    TEXT
before      JSONB      -- snapshot before the change (nullable)
after       JSONB      -- snapshot after the change (nullable)
ip          TEXT
createdAt   TIMESTAMP
```

All writes are append-only. No updates, no deletes.

---

## Action-name catalog (Sprint 1 → 10)

### Auth + admins
| Action | Entity | Emitted by |
|---|---|---|
| `auth.b2b.password_reset.request` | User | user-initiated |
| `admin.user.invite` | AdminInvite | OWNER |
| `admin.user.invite_accept` | User | invited user |
| `admin.user.invite_resend` | AdminInvite | OWNER |
| `admin.user.invite_revoke` | AdminInvite | OWNER |
| `admin.user.role_change` | User | OWNER |
| `admin.user.deactivate` | User | OWNER |
| `admin.user.reactivate` | User | OWNER |

### B2C customers
| Action | Entity |
|---|---|
| `customer.contact_update` | User |
| `customer.deactivate` | User |
| `customer.reactivate` | User |

### Orders
| Action | Entity |
|---|---|
| `order.status.update` | Order |
| `order.status.bulk_update` | Order |
| `order.notes.update` | Order |
| `order.cancellation.process` | Order |
| `order.cod.paid` | Order |
| `order.line.qty_update` | OrderItem |
| `order.line.remove` | OrderItem |
| `b2b.order.confirm` | Order |

### Returns
| Action | Entity |
|---|---|
| `order.return_recorded` | Return |
| `order.return_decision_update` | Return |

### Catalog (inventory, products, brands, categories, printer models)
| Prefix |
|---|
| `catalog.brand.*` |
| `catalog.category.*` |
| `catalog.product.*` |
| `catalog.product.image.*` |
| `catalog.printer_model.*` |
| `inventory.receive` |
| `inventory.adjust` |
| `inventory.threshold.*` |
| `product.returnable_update` |

### B2B
| Action | Entity |
|---|---|
| `b2b.application.approve` | B2BApplication |
| `b2b.application.reject` | B2BApplication |
| `b2b.company.terms_update` | Company |
| `b2b.company.override.create` | CompanyPriceOverride |
| `b2b.company.override.update` | CompanyPriceOverride |
| `b2b.company.override.delete` | CompanyPriceOverride |
| `b2b.company.override.bulk_import` | Company |

### Settings (OWNER only)
| Action | Entity |
|---|---|
| `settings.shipping.zone.update` | ShippingZone |
| `settings.shipping.thresholds.update` | Setting |
| `settings.shipping.governorate.reassign` | GovernorateZone |
| `settings.cod.update` | Setting |
| `settings.vat.update` | Setting |
| `settings.notifications.update` | Setting |
| `settings.store_info.update` | Setting |
| `settings.store_info.logo_upload` | Setting |
| `settings.store_info.logo_clear` | Setting |
| `settings.returns.update` | Setting |
| `promo.create` / `promo.update` / `promo.toggle` / `promo.bulk_disable_expired` | PromoCode |
| `courier.create` / `courier.update` / `courier.toggle_active` / `courier.delete` | Courier |

---

## Common queries

Run via `docker compose exec pbf-prod-db psql -U pbf -d pbf` (swap `staging` in names for staging).

### 1. All admin activity for a user in the last 7 days

```sql
SELECT "createdAt", "action", "entityType", "entityId", "before", "after"
FROM "AuditLog"
WHERE "actorId" = 'cuid_of_admin_here'
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC
LIMIT 200;
```

### 2. Who touched this order?

```sql
SELECT "createdAt", u.name, "action", "before", "after"
FROM "AuditLog" a
LEFT JOIN "User" u ON u.id = a."actorId"
WHERE a."entityType" IN ('Order', 'OrderItem', 'Return')
  AND (
    a."entityId" = 'order_id_here'
    OR a."after"::text LIKE '%order_id_here%'
    OR a."before"::text LIKE '%order_id_here%'
  )
ORDER BY "createdAt" ASC;
```

### 3. All policy-override returns (Sprint 10 feature)

```sql
SELECT r.id, r."createdAt", o."orderNumber", u.name AS recorded_by,
       r.reason, r."overrideReason", r."refundDecision"
FROM "Return" r
JOIN "Order" o ON o.id = r."orderId"
LEFT JOIN "User" u ON u.id = r."createdById"
WHERE r."policyOverride" = true
ORDER BY r."createdAt" DESC;
```

### 4. Role changes this quarter

```sql
SELECT "createdAt",
       (SELECT name FROM "User" WHERE id = a."actorId") AS changed_by,
       (SELECT name FROM "User" WHERE id = a."entityId") AS target,
       a."before"->>'role' AS from_role,
       a."after"->>'role' AS to_role
FROM "AuditLog" a
WHERE a."action" = 'admin.user.role_change'
  AND a."createdAt" > date_trunc('quarter', NOW())
ORDER BY "createdAt" DESC;
```

### 5. Recent settings changes (who touched what, when)

```sql
SELECT a."createdAt", u.name AS by_user, a.action, a.before, a.after
FROM "AuditLog" a
LEFT JOIN "User" u ON u.id = a."actorId"
WHERE a."action" LIKE 'settings.%'
  AND a."createdAt" > NOW() - INTERVAL '30 days'
ORDER BY "createdAt" DESC;
```

### 6. B2B price overrides imported last week

```sql
SELECT a."createdAt", u.name AS by_user, c.nameAr AS company,
       (a.after->>'created')::int AS created_rows,
       (a.after->>'updated')::int AS updated_rows,
       (a.after->>'errorCount')::int AS errors
FROM "AuditLog" a
LEFT JOIN "User" u ON u.id = a."actorId"
LEFT JOIN "Company" c ON c.id = a."entityId"
WHERE a.action = 'b2b.company.override.bulk_import'
  AND a."createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

### 7. Inventory movements cross-check vs audit log

```sql
-- All stock receives + restocks via return flow this month
SELECT "createdAt", "productId", "type", "qtyDelta", "reason", "actorId"
FROM "InventoryMovement"
WHERE "type" IN ('RECEIVE', 'RETURN', 'ADJUST')
  AND "createdAt" > date_trunc('month', NOW())
ORDER BY "createdAt" DESC;
```

---

## Retention

No automated purge — audit logs are append-only and retained indefinitely. At ~30 admin actions/day this table stays <1M rows/year and fits on the MVP VPS without issue. Archive-to-cold-storage is a v1.1 concern.

---

## When the UI viewer lands (v1.1)

The viewer will paginate `AuditLog` with filters on: actor, entity type, entity ID, date range, action prefix. These SQL patterns translate directly to the Prisma queries that the viewer will run.

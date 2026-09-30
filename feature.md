# Vendor to Dispatch Delivery Partnerships

**Status:** Proposed · **Mode:** FEATURE · **Date:** 2026-09-30 · **Repos:** `servipal-app-new` (Expo) + `servipal-backend` (FastAPI, Supabase)

## Summary

Restaurants and laundry vendors today deliver orders themselves using a flat fee, with nobody assigned in the system. This feature lets a vendor connect to one or more dispatch companies already operating in the app. When a vendor has switched delivery off, the customer is offered **External delivery** in place of *Vendor Delivery*, sees every available rider from that vendor's connected dispatch companies within range, picks one, and pays. A real `delivery_orders` row is then created and runs through the rider lifecycle the app already has. *Pickup from Store* stays on offer throughout, so a vendor is never left un-orderable.

Connections are many to many in both directions. The vendor sends a request, the dispatch accepts or declines, and either side can disconnect later. The courier "send package" flow is completely untouched.

Scope is **food and laundry vendors only**. Marketplace products and reservations are out of scope, and no courier code path changes.

## Context

Vendors switch delivery on today with `profiles.can_pickup_and_dropoff` and set a flat price in `profiles.pickup_and_delivery_charge`. The order then moves `PENDING → READY → COMPLETED` with no rider anywhere in the system, and the vendor uses their own staff. Meanwhile the app already runs a full dispatch operation for the courier flow: dispatch companies are `profiles` rows with `user_type = 'DISPATCH'`, their riders are `user_type = 'RIDER'` rows pointing back through `profiles.dispatcher_id`, and `delivery_orders` carries the whole assign, accept, pick up, transit, deliver, complete lifecycle plus its own escrow and payout.

Nothing joins those two halves. This feature adds the join: a partnership table between vendors and dispatch companies, and a `delivery_orders` row attached to a food or laundry order when the customer chooses a dispatch rider.

Constraints that shaped it: `food_orders` and `laundry_orders` already hold `pickup_coordinates`, `dropoff_coordinates`, `distance`, `pickup_location` and `destination`, so no location data had to be invented. Pricing for courier already comes from the single `charges_and_commissions` row, so the same config prices this path. The customer ledger dedupes by order id, which is what keeps a second delivery row from showing up as a second charge.

## Requirements

| AC | Requirement |
|---|---|
| AC-1 | A food or laundry vendor can browse a directory of dispatch companies and send a connection request, which sits in `PENDING` |
| AC-2 | The target dispatch sees the request in an inbox, **receives a push notification the moment the request arrives**, and accepts or declines, optionally with a note; the vendor is notified of the outcome by push |
| AC-3 | After acceptance the vendor sees the dispatch listed as `ACCEPTED` with its name, rating and rider count |
| AC-4 | Either side can disconnect unilaterally. In flight deliveries keep running to completion; only new orders stop seeing those riders |
| AC-5 | The **Delivery Method** block always shows **Pickup from Store**. It shows **Vendor Delivery** only when `can_pickup_and_dropoff = true`, and **External delivery** only when `can_pickup_and_dropoff = false` **and** the rider query returns at least one rider from an accepted connection online and within `max_distance_km` of the vendor's `pickup_coordinates` (default `10`, overridable per request). The two delivery options are therefore mutually exclusive, decided by that one flag, and never render together. With External delivery selected the customer sees the rider list showing rider name, image, rating, distance, plus the dispatch business name and rating. Server side the exclusivity is enforced as well as drawn: `VENDOR_DELIVERY` with the flag off already returns `400 "This vendor does not offer delivery"` (`food_service.py:798`, `laundry_service.py:631`), and `DISPATCH_DELIVERY` with the flag on is rejected the same way |
| AC-6 | External delivery is withheld whenever the vendor has `can_pickup_and_dropoff = true`, has no accepted connection, or has no rider online within `max_distance_km`. In all three cases *Pickup from Store* remains and the customer can still check out, so **connecting a dispatch company can only ever add an option, never remove one**, and a vendor whose riders all go offline falls back to pickup rather than becoming un-orderable. This replaces today's behaviour where `can_pickup_and_dropoff = false` renders a single always-selected *Select delivery address* radio whose value is forced to `PICKUP`: that slot becomes External delivery when it can render, and plain pickup when it cannot |
| AC-7 | The cart shows a dispatch delivery fee quoted by the server as `base_delivery_fee + delivery_fee_per_km x distance`, where `distance` is the **map route distance computed in the UI** by `utils/map.ts` Mapbox Directions, exactly as the courier flow gets it. Straight line `ST_Distance` is never used for pricing. The quote returns `{distance_km, duration, delivery_fee}`. Payment re-sends `distance_km`, `duration` and `quoted_fee`; the server recomputes from `distance_km` and rejects with `409` if the recomputed fee differs from `quoted_fee` by more than `0.01`, or if `distance_km` is not in `(0, 100]` km |
| AC-8 | The customer is charged once: `grand_total = goods_total + dispatch_fee`. The order stores `total_price = goods_total`, `delivery_fee = dispatch_fee`, `vendor_pickup_dropoff_charge = 0`. For food `goods_total` is `p_total_price`; for laundry it is `p_subtotal`, which is what `process_laundry_payment_new` writes into `total_price` |
| AC-9 | Two branches, no ambiguity. On `delivery_option = 'DISPATCH_DELIVERY'`: `amount_due_vendor = round(goods_total x (1 - food_commission_rate))` and `amount_due_dispatch = round(dispatch_fee x (1 - delivery_commission_rate))`, so the platform keeps the remainder of **both** buckets. On every other option the existing formula is untouched: `amount_due_vendor = round(grand_total x (1 - food_commission_rate))`, which correctly includes the fee when the vendor delivers it themselves |
| AC-10 | The customer's ledger keeps exactly one DEBIT row for the order at `grand_total`. No second customer debit is ever written for the delivery. Balance is per order through `delivery_order_id`, not per `tx_ref` |
| AC-11 | On payment success a `delivery_orders` row is created with an `order_number`, `delivery_status='PENDING'`, `payment_status='PAID'`, `had_escrow=false`, `order_type='FOOD'` or `'LAUNDRY'`, `delivery_type='STANDARD'` (or `'SCHEDULED'` when the order is scheduled), linked from `food_orders.delivery_order_id` / `laundry_orders.delivery_order_id`, and the chosen rider is assigned through `assign_rider_to_delivery` in the same operation. Assignment is an offer the rider must accept, so the status moves `PENDING → ASSIGNED` at capture and `ASSIGNED → ACCEPTED` when the rider accepts. **The rider receives a push notification on `ASSIGNED`, and the customer receives a push notification if the rider declines.** If the rider does decline the delivery flips to `DECLINED`, the customer is notified, and the customer picks again through the AC-17 endpoint. `had_escrow` starts `false` and is set `true` by the existing pickup path, which this feature reuses unchanged |
| AC-12 | Rider availability is checked at **two moments**, because they protect different things. At `initiate-payment`, before any charge, layer A and a read-only version of layer B run together; failure returns `409` with the exact string `That rider is no longer available. Please choose another.`, no order is created and no money moves. At **capture**, after the charge, the order and delivery row are kept even if `assign_rider_to_delivery` then raises: the delivery is stored as `PAID_NEEDS_RIDER`, the customer is notified, and the customer re-picks through AC-17. Money is never rolled back. Layer A is re-run at capture so a connection severed or a rider suspended between initiation and capture still cannot take the job. Both layers are identical to the rider list, and `assign_rider_to_delivery` runs the rider check inside the assigning transaction, so two concurrent checkouts cannot claim one rider |
| AC-13 | The rider travels to the store as soon as payment succeeds and waits for the order to be ready. **Exception:** when the order carries a schedule (`food_orders.scheduled_at`, `laundry_orders.pickup_time`), the travel notification is held until that time rather than fired at payment, so a rider is never sent to a closed or future pickup |
| AC-14 | **On completion each party is paid their own amount due, and both payouts already exist.** The vendor is paid `amount_due_vendor` by the existing order completion path, `app/common/order.py:214` calling `enqueue_transfer_task_gct(order_id, payout_to="VENDOR", order_type="FOOD_ORDER")`, with `food_service.py:428` firing the same thing at confirm. The dispatch is paid `amount_due_dispatch` by `app/services/delivery_service.py:733` calling `enqueue_transfer_task_gct(order_id=delivery_id, payout_to="VENDOR", order_type="DELIVERY_ORDER")` when the delivery completes; `get_order_payout_info`'s `DELIVERY_ORDER` branch resolves it by mapping `vendor_id := delivery_orders.dispatch_id` and `amount_due_vendor := delivery_orders.amount_due_dispatch`. This feature adds **no payout code at all**; it only has to set both amounts correctly. Two `payouts` rows with two distinct references keeps `get_payout_by_reference` unambiguous. Two things can still stop the money: a missing `beneficiaries` row, prevented by AC-21, and a fraud `REVIEW`, which holds the payout without losing it under AC-22 |
| AC-15 | Cancelling or rejecting the order before pickup cancels the linked delivery, notifies and releases the rider, and triggers no dispatch payout. Allowed only while `delivery_status` is `PENDING`, `ASSIGNED`, `ACCEPTED`, `DECLINED` or `PAID_NEEDS_RIDER`; once `PICKED_UP` only the return flow applies, and that return flow runs against these rows exactly as it does against courier rows. The customer is refunded **`grand_total` in full** through the existing `refund_service.refund_customer_payment`, `amount_due_vendor` is suppressed, and both the dispatch CREDIT row and the goods `platform_commissions` row are deleted, because no service was delivered and no commission was earned |
| AC-16 | `vendor_dispatch_connections.vendor_id` accepts only `RESTAURANT_VENDOR` and `LAUNDRY_VENDOR`; the pair is unique; no courier code path changes. Every edit to a shared function branches solely on the new `delivery_option` or `order_type`, and the new `order_type` value lands in the same migration as the branch |
| AC-17 | If the food order is created but the delivery is not, the paid order survives, delivery creation is retried through the existing dead letter pattern, and the customer can pick a rider again through `POST /api/v1/orders/{order_id}/assign-delivery`. **Authorization: the order owner only**, enforced with `require_user_type` on the customer who placed the order. The endpoint creates the delivery row first if `delivery_order_id` is null, reuses the `distance`, `delivery_fee` and `amount_due_dispatch` already stored on the order so no fee is recomputed and no money moves, then applies layer A and calls `assign_rider_to_delivery` so layer B runs. This is also the path used when a delivery sits in `PAID_NEEDS_RIDER` or `DECLINED` |
| AC-18 | Connection rows are visible to exactly the two parties; the directory is vendor only; accept and decline is dispatch account only; the rider query is open to any signed in user but returns display fields only |
| AC-19 | **Every status change pushes to all involved parties**, following the recipient matrix in Notifications. A party is involved if the event concerns them. The push is fired through `enqueue_notification_task_gct`, which fans out by calling it once per recipient |
| AC-20 | Push reaches a user only if they have a row in `push_tokens`. `get_push_token` reads the **latest** token per user, so a user with two devices is notified on only one of them. A missing token logs `push_notification_no_token` and the push is dropped, never an error. Because push is best effort and there is no in app notification table, every event in the matrix must also be reachable by opening the relevant screen: the dispatch inbox for a connection request, the order screen for a delivery status |
| AC-21 | **A dispatch that cannot be paid cannot accept.** `POST /dispatch/connection-requests/{id}/accept` returns `409` unless `beneficiaries` holds a row for `id = dispatch_id` with a non empty `account_number` and `bank_code`, and the message says to add a payout account first. This is the last point before any money can be owed, so it is where the check belongs. **No auth or schema change is needed:** `POST /api/v1/beneficiaries` depends only on `get_current_profile` with no user type restriction and writes `id = current_profile["id"]`, which is the same column the payout join uses (`b.id = d.dispatch_id`), so a DISPATCH account can already add a bank account today. The dispatch inbox shows the same state with a link to add one, and the vendor directory marks the dispatch as not yet payable so vendors do not send requests that cannot be answered. The dispatch stays discoverable: hiding it would explain nothing to the dispatch, who would then never add the account. If a dispatch deletes its account after accepting, the existing machinery closes it: `PAYOUT_CLAIMABLE_STATUSES` includes `FAILED`, and `POST /api/v1/payouts/{transfer_id}/retry` already exists, so the failed row stays claimable with no new code |
| AC-22 | **A held payout is a row, not a log line.** `hold_payout = (assessment.action == RiskAction.REVIEW)` at `app/services/delivery_service.py:693`. Today the held branch writes only `logger.warning("delivery_payout_held_for_review")` and returns, and because `delivery_service.py:733` skips the enqueue, `ensure_pending_payout_row` is never reached from this path: the row that would carry the `reference` is never created, so nothing shows in any admin surface and there is nothing to retry by. The fix calls `ensure_pending_payout_row` **before** the branch and skips only `enqueue_transfer_task_gct` when held, writing the reason to `complete_message` (`_update_payout_status` already uses that column for `NO_BENEFICIARY`) and the fraud reference to `meta` beside `recipient_user_id`. The row lands as `PENDING`. Three schema facts make this cheap: `payouts.status` has **no `CHECK` constraint**; `requires_approval` and `is_approved` are `boolean NOT NULL DEFAULT false` and `build_payout_row_from_order` deliberately omits them so the defaults apply, which already expresses "held, awaiting review"; and `assert_manual_payout_allowed` rejects only `PAYOUT_BLOCKED_STATUSES` and `PAYOUT_IN_FLIGHT_STATUSES`, so a held `PENDING` row still passes and admin can release it through the existing manual payout path. `BLOCK` is unchanged: it still refuses completion outright at `delivery_service.py:685` |
| AC-23 | **One kill switch, in the backend only.** `DISPATCH_CHECKOUT_ENABLED`, read from the existing `Servi-pal-secret`, decides whether the feature is reachable. When false, `GET /dispatch/riders` returns an empty list and `POST /delivery/quote` returns `404`. The cart already withholds *External delivery* whenever the rider list is empty, so the option disappears with no client change at all. A frontend flag was considered and rejected: `EXPO_PUBLIC_*` values are baked into the bundle at build time, so toggling one would need an EAS build and a store release, which is a release rather than a kill switch. Turning this off hides the feature on the next API deploy, needs no app rebuild, and cannot be bypassed by a client running an older bundle |

## Decision

### Data model

**New table `vendor_dispatch_connections`**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `vendor_id` | uuid FK → `profiles(id)` | `CHECK` restricts to `RESTAURANT_VENDOR`, `LAUNDRY_VENDOR` |
| `dispatch_id` | uuid FK → `profiles(id)` | must be `DISPATCH` |
| `status` | text | `PENDING` · `ACCEPTED` · `DECLINED` · `DISCONNECTED` |
| `requested_by` | uuid FK → `profiles(id)` | |
| `requested_at` | timestamptz | |
| `responded_at` | timestamptz null | |
| `response_note` | text null | reason on decline |
| `created_at`, `updated_at` | timestamptz | |

`UNIQUE (vendor_id, dispatch_id)`. Indexes on `dispatch_id` and `(vendor_id, status)`. One row per pair carries the whole history: disconnect flips to `DISCONNECTED`, reconnect flips back to `PENDING`.

**`food_orders` and `laundry_orders`** gain two nullable things: `delivery_order_id uuid → delivery_orders(id)`, and a new allowed value `DISPATCH_DELIVERY` for the existing `delivery_option` text column.

**`delivery_orders` columns are unchanged.** New rows reuse the table as is, with the full insert list fixed so nobody has to guess:

| Column | Value on this path |
|---|---|
| `order_number` | `nextval('delivery_orders_order_number_seq')`. The column is `bigint NOT NULL UNIQUE` with **no default**, so it must be supplied. This is why the existing courier capture RPC, which omits it, has never successfully inserted a row |
| `sender_id` | customer id |
| `tx_ref` | `DELIVERY-FOOD-<order_uuid>` or `DELIVERY-LAUNDRY-<order_uuid>` |
| `order_type` | `'FOOD'` or `'LAUNDRY'` as text. Courier rows keep their existing value and are never rewritten |
| `delivery_status` | `'PENDING'` at insert, which is the column default and is accepted by `assign_rider_to_delivery`. The RPC then moves it to `ASSIGNED` |
| `payment_status` | `'PAID'`, required by `assign_rider_to_delivery` |
| `had_escrow` | `false` until pickup |
| `delivery_type` | `'STANDARD'`, or `'SCHEDULED'` when `food_orders.scheduled_at` or `laundry_orders.pickup_time` is set. Only those two values pass the `CHECK` |
| `package_name` | `Food order #<order_number>` or `Laundry order #<order_number>`, because the column is `NOT NULL` |
| `pickup_location` | vendor `profiles.business_address` |
| `destination` | `food_orders.destination` / `laundry_orders.destination` |
| `pickup_coordinates` | vendor `profiles.location_coordinates`, copied onto the order first |
| `dropoff_coordinates` | from the order's `dropoff_coordinates` |
| `distance` | the Mapbox route distance from the quote |
| `delivery_fee` | `dispatch_fee` |
| `amount_due_dispatch` | `round(dispatch_fee x (1 - delivery_commission_rate))` |
| `total_price` | `dispatch_fee`, for consistency with the courier insert |
| `duration` | route duration from the same Mapbox call |
| `receiver_phone` | customer `profiles.phone_number` |
| `sender_phone_number` | customer `profiles.phone_number` |
| `flw_ref` | Flutterwave reference of the successful payment |
| `dispatch_id`, `rider_id`, `rider_phone_number` | left null on insert; `assign_rider_to_delivery(p_tx_ref, p_rider_id)` sets all three |

The `tx_ref` prefix `DELIVERY-` is already mapped to `delivery_orders` in `_REFERENCE_ORDER_TABLES`, so **`transfer_webhook.py` needs no change**. Both order tables already carry `pickup_coordinates`, `dropoff_coordinates`, `distance`, `pickup_location` and `destination`, so no location data has to be added.

### Money

```
-- DISPATCH_DELIVERY only
dispatch_fee        = round(base_delivery_fee + delivery_fee_per_km x distance, 2)   -- server side
grand_total         = goods_total + dispatch_fee
amount_due_vendor   = round(goods_total  x (1 - food_commission_rate),     2)
amount_due_dispatch = round(dispatch_fee x (1 - delivery_commission_rate), 2)

-- every other delivery_option, unchanged from today
amount_due_vendor   = round(grand_total x (1 - food_commission_rate), 2)
```

Both branches use `x (1 - rate)` because migration `025_fix_capture_vendor_amounts.sql` already corrected the formulas that used to store the platform cut in `amount_due_vendor`. Vendor delivers, pickup, courier, product and reservation paths keep their current arithmetic untouched.

#### Complete row set

Balance is asserted **per order**, by joining on `delivery_order_id`, never per `tx_ref`. A dispatch order writes these five:

| # | Table | `tx_ref` | `order_id` | `order_type` | `label` | `to_user_id` | `amount` | `transaction_type` | Writer | When |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `transactions` | food/laundry `tx_ref` | food/laundry order | `FOOD` / `LAUNDRY` | `DEBIT` | customer | `grand_total` | `ESCROW_HOLD` | `process_food_payment` / `process_laundry_payment_new` | payment |
| 2 | `transactions` | food/laundry `tx_ref` | food/laundry order | `FOOD` / `LAUNDRY` | `CREDIT` | **vendor** | `grand_total` | `ESCROW_HOLD` → `ESCROW_RELEASE` at confirm | same capture function, same transaction | payment, then confirm |
| 3 | `transactions` | **delivery** `tx_ref` | **delivery order** | **`DELIVERY`** | `CREDIT` | **dispatch** | `dispatch_fee` | `ESCROW_HOLD` → `ESCROW_RELEASE` at delivery completion | same capture function, same transaction | payment, then completion |
| 4 | `platform_commissions` | food/laundry `tx_ref` | food/laundry order | n/a | n/a | n/a | `grand_total - amount_due_vendor` | n/a | `record_platform_commission` | confirm |
| 5 | `platform_commissions` | delivery `tx_ref` | delivery order | n/a | n/a | n/a | `dispatch_fee - amount_due_dispatch` | n/a | `record_platform_commission` | delivery completion |

Rows 1 and 2 already exist today for every food and laundry order. This feature adds row 3 and row 5, and changes the arithmetic behind rows 2 and 4 only when `delivery_option = 'DISPATCH_DELIVERY'`.

**Row 3 must have `order_id = delivery_orders.id` and `transactions.order_type = 'DELIVERY'`.** This is not cosmetic: `get_user_transactions` computes

```
net_amount = COALESCE(food_orders.amount_due_vendor,
                      laundry_orders.amount_due_vendor,
                      delivery_orders.amount_due_dispatch,
                      transactions.amount)
```

so the dispatch's Pending Payout and Paid Out figures are read from `delivery_orders.amount_due_dispatch`, **not** from `transactions.amount`. If row 3 pointed at the food order id instead, the dispatch would be shown the vendor's figure. `transactions.amount` on row 3 is therefore display only.

Rows 2 and 3 carry `label = 'CREDIT'` with different `to_user_id`, so `get_user_transactions` puts row 2 in the vendor's ledger, row 3 in the dispatch's ledger, and neither in the customer's, because side is derived from `details->>'label'` combined with `from_user_id` / `to_user_id`. The customer sees row 1 only, which satisfies AC-10 without relying on dedupe at all.

**Why row 3 needs its own `tx_ref`.** `get_payout_by_reference` looks up `payouts` by `reference` with `.maybe_single()`, so a vendor payout and a dispatch payout sharing one reference would break. The delivery `tx_ref` is `DELIVERY-FOOD-<order_uuid>` or `DELIVERY-LAUNDRY-<order_uuid>`. The `DELIVERY-` prefix is already mapped to `delivery_orders` in `_REFERENCE_ORDER_TABLES`, so **`transfer_webhook.py` needs no edit**, and the reference cannot collide with the food order's payout.

Row 3 is written at payment as `ESCROW_HOLD`, flips to `ESCROW_RELEASE` at **delivery completion** exactly the way row 2 flips at food confirm, and receives `released_at` only when the dispatch's bank transfer reports `SUCCESSFUL`. Those are three separate events: `transaction_type` marks the work being done, `released_at` marks the money actually leaving, and Pending Payout versus Paid Out is driven by `released_at` alone.

### Availability rule

The Dispatch option depends on **two independent gates, both of which must pass**.

The first is `profiles.can_pickup_and_dropoff`, the same flag the profile toggle calls *Pickup & delivery*. It decides **which** delivery option the customer is offered: on, the vendor delivers itself and the customer gets *Vendor Delivery*; off, and the customer gets *External delivery*. The two are mutually exclusive and never render together, so this flag is no longer independent of Dispatch — it is the switch that selects between them. *Pickup from Store* renders in every case.

The second is **an accepted connection plus a rider in range**, which decides whether *External delivery* can be offered at all. When it fails, the option is withheld and *Pickup from Store* remains, so a vendor is never left un-orderable.

There are two layers, and both list and payment apply them in the same order. That is what keeps AC-5 and AC-12 from ever disagreeing.

**Layer A, Python, applied on the rider list and again at payment**

```
EXISTS (vendor_dispatch_connections
        WHERE vendor_id = :vendor AND dispatch_id = rider.dispatcher_id
          AND status = 'ACCEPTED')
AND profiles.rider_is_suspended_for_order_cancel = false
```

**Layer B, already enforced by existing code**

The list calls `get_available_riders(near_lat, near_lng, max_distance_km)`, which already filters `user_type = 'RIDER'`, `is_online = true`, `is_blocked = false`, `has_delivery = false` and does the `ST_DWithin` range check. Payment calls `assign_rider_to_delivery(p_tx_ref, p_rider_id)`, which runs those same rider checks inside the assigning transaction and raises if any fails.

So `has_delivery` needs no new semantics: `assign_rider_to_delivery` sets it `true` on assign and the existing complete and cancel paths set it `false`. No courier code changes.

**Distance.** `max_distance_km` defaults to `10`, overridable per request with a hard ceiling of `50`. The origin is **always the vendor's `pickup_coordinates`, read server side**; the endpoint takes no client coordinates at all, because a client supplied origin would silently change which riders are offered. Straight line distance is correct for *rider proximity* and is what `get_available_riders` already does.

**Delivery distance is a different thing.** The customer to vendor to customer distance used for pricing comes from the Mapbox route in the UI, not from `ST_Distance`. Straight line would understate real road distance and underprice the order.

**When each layer fails.** Before the charge, a layer A or layer B failure is returned as `409` with the exact string `That rider is no longer available. Please choose another.`, replacing the RPC's own wording so the client never sees internal text, and nothing is created. After the charge, a layer B failure is not an error the customer can act on by retrying payment, so the order is kept and the delivery is parked in `PAID_NEEDS_RIDER` for the customer to resolve through AC-17.

### Endpoints

Connection, vendor side

- `GET /api/v1/dispatches` — directory, `q`, `page`, `page_size`; returns business name, dispatch rating, rider count, live online rider count, and the caller's current `connection_status` if any. Vendors only. Dispatch rating and rider count are **computed from that dispatch's rider rows**, the same way `get_available_riders` does it: `AVG(rider.average_rating) WHERE rider.review_count > 0` and `COUNT(rider rows)`. They are not `profiles` columns. (`profiles.dispatch_average_rating` does not exist, and `profiles.dispatch_total_riders` exists but is maintained elsewhere and may drift, so it is not used.)
- `POST /api/v1/vendor/dispatch-connections` — `{dispatch_id}`; `409` on an existing active or pending pair
- `GET /api/v1/vendor/dispatch-connections` — `?status=`
- `DELETE /api/v1/vendor/dispatch-connections/{dispatch_id}` — disconnect

Connection, dispatch side

- `GET /api/v1/dispatch/connection-requests` — `PENDING` inbox
- `POST /api/v1/dispatch/connection-requests/{id}/accept`
- `POST /api/v1/dispatch/connection-requests/{id}/decline` — `{note?}`
- `DELETE /api/v1/dispatch/connection-requests/{id}` — dispatch side disconnect

Checkout

- `POST /api/v1/delivery/quote` — `{vendor_id, distance_km, duration}` → `{distance_km, duration, delivery_fee}`. `distance_km` and `duration` come from the Mapbox route computed in `utils/map.ts`, not from straight line. The server validates `0 < distance_km <= 100`, recomputes the fee from `charges_and_commissions`, and echoes all three back. The client keeps the returned `delivery_fee` and sends it back as `quoted_fee`.
- `GET /api/v1/dispatch/riders?vendor_id=&max_distance_km=` → rider id, name, image, rating, distance, `dispatch_id`, dispatch business name, dispatch rating. Built by calling the existing `get_available_riders` RPC with **the vendor's `pickup_coordinates` as `near_lat` / `near_lng`** — the client cannot supply the origin, because a different origin would change the rider set and let a client widen the radius. Then apply layer A in Python to keep only riders whose dispatch has an `ACCEPTED` connection, then remap the RPC's column names (`full_name` stays, `profile_image_url` stays, `rider_rating` → `average_rating`, `rider_reviews` → `review_count`, `dispatch_avg_rating` → `dispatch_average_rating`). Empty result means the cart hides Dispatch. The RPC itself is not modified.

Payment

- `POST /api/v1/food/initiate-payment` and `/laundry/initiate-payment` accept `delivery_option='DISPATCH_DELIVERY'`, `rider_id`, `distance_km`, `duration`, `quoted_fee` and both coordinate pairs. Layer A plus a read-only layer B run **here, before the charge**; failure is `409` with the AC-12 string and nothing is created. On success the capture function recomputes the fee from `distance_km`, compares against `quoted_fee`, inserts the delivery row with `order_number = nextval(...)`, writes `delivery_order_id` on the order, and calls `assign_rider_to_delivery(p_tx_ref, p_rider_id)` in the same transaction so layer B runs atomically. If that call raises, the transaction is **not** rolled back: the order and delivery stay, the delivery is set to `PAID_NEEDS_RIDER`, and the customer is told to pick again.

Retry

- `POST /api/v1/orders/{order_id}/assign-delivery` — `{rider_id}`. **Order owner only.** Creates the delivery row first if `delivery_order_id` is null (the dead letter retry may not have landed), reusing the `distance`, `delivery_fee` and `amount_due_dispatch` already stored on the order, then applies layer A and calls `assign_rider_to_delivery`. Handles the `PAID_NEEDS_RIDER` and `DECLINED` cases. No new money moves.

Read model

- `get_order_details` gains rider name, rider phone, dispatch business name and delivery status, so the order screen and receipt can show who is coming.

### Authorization

- Directory: vendor user types only (`RESTAURANT_VENDOR`, `LAUNDRY_VENDOR`).
- Request rows: visible to exactly `vendor_id` and `dispatch_id`.
- Accept, decline: dispatch account only, via `require_user_type([DISPATCH])`.
- Disconnect: either party, unilateral, no approval.
- Rider query: any signed in user, display fields only (no phone numbers, only the rider id needed to select).
- `DISPATCH_DELIVERY` rejected for marketplace products and reservations.
- Courier routes and RPCs untouched.

### Notifications

**Mechanism.** One path for everything: `enqueue_notification_task_gct(user_id, title, body, data)` in `app/gct_queue/producer.py:125` enqueues a Cloud Task, the task calls `POST /internal/send-notification`, which calls `notify_user`, which reads the user's latest row from `push_tokens` and sends the push. Fan out is a loop: one call per recipient.

`notify_user` returns `False` and logs `push_notification_no_token` when the user has no token, and `get_push_token` picks the newest token only, so multi device users get one push (AC-20). Push is the only channel, there is no in app notification table, so the dispatch inbox and the order screen are the durable surfaces and push is the alert that points at them.

`enqueue_notification_task_gct` gains one **optional** `schedule_time: datetime | None = None` parameter for AC-13's hold. Existing callers pass nothing and are unaffected.

**Recipient rule.** A party is involved if the event concerns them, and **the party who performed the action is not notified of their own action**. That single rule produces the matrix below.

**Connection lifecycle**

| Event | customer | vendor | rider | dispatch |
|---|---|---|---|---|
| Vendor sends a connection request | – | actor | – | yes |
| Dispatch accepts or declines | – | yes | – | actor |
| Either side disconnects | – | yes unless actor | – | yes unless actor |

**Delivery lifecycle** (only for orders with `delivery_order_id`)

| Event | customer | vendor | rider | dispatch |
|---|---|---|---|---|
| `PAID_NEEDS_RIDER`, assignment failed at capture | yes | yes | – | – |
| `ASSIGNED` | yes | yes | yes | yes |
| `ACCEPTED` | yes | yes | actor | yes |
| `DECLINED` | yes | yes | actor | yes |
| `PICKED_UP` | yes | yes | actor | yes |
| `IN_TRANSIT` | yes | yes | actor | yes |
| `DELIVERED` | yes | yes | actor | yes |
| `COMPLETED` | actor | yes | yes | yes |
| `CANCELLED` | yes unless actor | yes unless actor | yes unless actor | yes unless actor |

**What is actually new here.** Against `_send_delivery_notifications` as it stands today, this adds the vendor as a recipient on every row, the customer on `ASSIGNED`, the entire `PAID_NEEDS_RIDER` row, and every connection event, which has no code at all yet. The rider on `ASSIGNED` and the customer on `DECLINED` already exist in code and are kept unchanged.

**Where the code lives, and why courier is safe.** `app/common/order.py:_send_delivery_notifications` already holds a `notification_config` keyed by `DeliveryStatus`, but its matrix is thinner than the one above: `ASSIGNED` reaches only the rider, `COMPLETED` reaches only rider and dispatch, and the vendor is never a recipient. Rewriting that matrix in place would change what courier customers receive, which AC-16 forbids. Instead the function takes one **optional** parameter, `expanded: bool = False`, which selects the matrix above when set. Courier call sites pass nothing and behave byte for byte as they do today; this feature's call sites pass `expanded=True`. Connection events are not delivery statuses, so they are separate calls and touch no shared code.

**What the scheduled hold does and does not do.** For a scheduled order the rider still sees the `ASSIGNED` job in their app immediately, because assignment happened at capture. Only the go signal, the travel notification, is deferred until `scheduled_at` / `pickup_time`. That is deliberate: the rider benefits from knowing the job exists, and gating job visibility on a schedule would mean adding a status nobody asked for. The vendor's READY notification, which is what actually prompts collection, remains the moment the order is ready.

### Edge cases

| Case | Handling |
|---|---|
| Rider stale at initiate-payment | Layer A plus a read-only layer B run before the charge, returned as `409` with the exact AC-12 string. Cart refetches the list. No order is created, no money moves |
| Rider vanishes **during** capture, after the charge | The order and delivery row are kept, `delivery_status = 'PAID_NEEDS_RIDER'`, customer notified and re-picks through AC-17. Money is never rolled back |
| Connection severed or rider suspended between initiation and capture | Layer A re-runs at capture and parks the delivery in `PAID_NEEDS_RIDER`, so a rider from a severed partnership never takes the job |
| Rider accepts then declines | Delivery flips to `DECLINED`, customer notified, customer picks again through AC-17. Layer B now passes because `has_delivery` was cleared |
| Connection severed with jobs running | Assigned deliveries finish; only new orders stop seeing those riders |
| Order cancelled before pickup | Cancel the linked delivery, notify and release the rider, refund `grand_total` **in full**, delete rows 3 and 5 from the ledger set, no payout. Blocked once `PICKED_UP` |
| Order cancelled after pickup | Only the return flow applies, and it operates on these rows exactly as it does on courier rows, because the dispatch CREDIT may already be `ESCROW_RELEASE`. The `delivery_orders` refund split for that path is inherited, not redesigned |
| Paid order, delivery creation fails | Keep the order, retry through `pending_payments` and the dead letter pattern, otherwise leave the order needing a rider |
| Vendor disconnects all dispatches mid checkout | Rider query returns empty, *External delivery* is withheld and *Pickup from Store* remains, and payment still rejects stale riders through the layer A and layer B checks |
| Vendor has delivery enabled (`can_pickup_and_dropoff = true`) | *Vendor Delivery* renders, *External delivery* never does, even with dispatch riders online. The customer is never offered both (AC-5) |
| Vendor has delivery disabled but no accepted connection | *External delivery* is withheld; *Pickup from Store* only (AC-6) |
| Vendor has delivery disabled but every rider is offline or out of range | *External delivery* is withheld; *Pickup from Store* only, so the store stays orderable (AC-6) |
| Client sends `VENDOR_DELIVERY` with the flag off | Already `400 "This vendor does not offer delivery"` (`food_service.py:798`, `laundry_service.py:631`) |
| Client sends `DISPATCH_DELIVERY` with the flag on | `400`, mirroring the above, so the exclusivity holds server side and does not depend on the client drawing it correctly (AC-5) |
| `DISPATCH_CHECKOUT_ENABLED` is turned off | `GET /dispatch/riders` returns `[]`, `POST /delivery/quote` returns `404`, and the cart renders *Pickup from Store* alone on the next request. No app rebuild, no store release, and a client running an older bundle is covered too (AC-23) |
| Kill switch flipped while a customer is mid checkout | The rider list is refetched when the address or selection changes, so the option disappears before payment. If it is selected anyway the quote call `404`s and the cart stays where it is rather than charging (AC-23) |
| Duplicate request for the same pair | `UNIQUE` constraint returns `409` |
| Declined vendor re-requests later | Allowed; the same row flips back to `PENDING` |
| Scheduled order paid before the pickup time | Rider is assigned and can see the job, but the travel notification is held until `scheduled_at` / `pickup_time` via `schedule_time` on the Cloud Task |
| A party has no `push_tokens` row | `notify_user` logs `push_notification_no_token` and returns `False`. The event is not retried, because there is no in app notification table to fall back on. The dispatch inbox and the order screen must therefore be able to show the event on their own (AC-20) |
| Dispatch has no `beneficiaries` row | Blocked at accept by AC-21, so unreachable in the normal flow. If the dispatch deletes the account afterwards, `get_order_payout_info` returns a null `beneficiary_id`, the completion payout fails with `NO_BENEFICIARY` and the row goes `FAILED`. `FAILED` is in `PAYOUT_CLAIMABLE_STATUSES`, so `POST /payouts/{transfer_id}/retry` releases it once the account is re-added. The delivery completes either way |
| Vendor sends a request to a dispatch with no payout account | The dispatch receives it and the push fires, but `accept` returns `409`. The inbox and the directory both show the missing account, so neither side is guessing (AC-21) |
| Fraud returns `REVIEW` at completion | Completion proceeds, a `payouts` row is created as `PENDING` with the hold reason in `complete_message` and the fraud reference in `meta`, and no transfer is enqueued. Admin releases it through the existing manual payout path, which accepts `PENDING`. `BLOCK` still refuses completion outright (AC-22) |
| Two devices registered for one user | `get_push_token` orders by `created_at desc` and takes one, so only the newest device is notified (AC-20) |

## Feature design

### Screens

**Vendor: delivery partners** (`app/dispatch-connections/`). Two tabs, connections and discover. Discover lists every `DISPATCH` profile with business name, average rating, rider count and how many riders are online right now, plus a **Connect** button that shows `Pending` until answered. A dispatch with no payout account is marked as such, so the vendor knows a request cannot be answered yet (AC-21). Connections lists accepted, pending and declined partners with a **Disconnect** action. Entry point sits in `app/(tabs)/profile/index.tsx` beside the existing Dispatch link.

**Dispatch: connection requests** (`app/dispatch-requests/`). Inbox of `PENDING` rows showing the vendor's business name, vendor type and rating, with **Accept** and **Decline** (decline optionally takes a note). When no payout account exists, the accept action explains `409` up front and links to adding one rather than letting the tap fail (AC-21). Reached from the dispatch profile section.

**Cart** (`app/cart.tsx`). The Delivery Method block is rebuilt around `can_pickup_and_dropoff`. **Pickup from Store** renders always. **Vendor Delivery** renders only when the flag is on. **External delivery** renders only when the flag is off *and* the rider query returns at least one rider, which takes over the single always-selected *Select delivery address* radio that sits at `app/cart.tsx:832` today. The restaurant radios at `app/cart.tsx:816` and the laundry chips at `app/cart.tsx:1163` follow the same branch rule, and `RequireDelivery` in `types/order-types.ts:16` gains `DISPATCH_DELIVERY`. Selecting External opens a rider list sheet reusing the shape of `app/riders.tsx`: rider image, name, rating, distance, and the dispatch business name with its rating, and opens the address sheet the way `VENDOR_DELIVERY` does, replacing the `PICKUP && !can_pickup_and_dropoff` condition at `app/cart.tsx:375` and `:517`. The pricing summary gains a `Dispatch delivery` row fed by the quote endpoint. The quote takes `distance_km` from the Mapbox route already computed by `utils/map.ts` for the chosen address, so picking or changing an address re-runs both the route and the quote.

**Order detail and receipt.** Once a delivery exists, `get_order_details` returns rider name, rider phone, dispatch name and delivery status. The order screen and `app/receipt/[id].tsx` / `app/receipt/laundry-receipt/[id].tsx` show who is bringing the order.

### Value sourcing

Every value an acceptance criterion needs, and where it comes from. No blank sources.

| Value | Source |
|---|---|
| `can_pickup_and_dropoff` | `profiles.can_pickup_and_dropoff`, read through `vendorProfile` and the same flag the profile toggle labels *Pickup & delivery* (`hooks/status-toggle.ts:149`). **It decides which delivery option renders:** on gives *Vendor Delivery*, off gives *External delivery*, and *Pickup from Store* renders either way (AC-5, AC-6) |
| external delivery available? | Two conditions anded: `can_pickup_and_dropoff = false`, and the rider query returning at least one rider after layer A and layer B. Either failing withholds the option and leaves *Pickup from Store* (AC-6) |
| `DISPATCH_CHECKOUT_ENABLED` | Backend settings, read from the existing `Servi-pal-secret`, default true. When false the riders endpoint returns `[]` and the quote endpoint `404`s; the cart needs no flag of its own because it already requires a non-empty rider list (AC-23) |
| `dispatch_fee` | Server: `charges_and_commissions.base_delivery_fee + delivery_fee_per_km x distance`, computed in `POST /delivery/quote` (AC-7) |
| `distance`, `duration` | Client, `utils/map.ts` Mapbox Directions route at quote time, sent back in the quote and initiate-payment payloads, stored on `food_orders.distance` / `laundry_orders.distance` and copied to the delivery. **This is the same route source the courier flow uses.** `ST_Distance` is never used for pricing, only for rider proximity |
| `goods_total` | Food: the `p_total_price` argument of `process_food_payment`, stored in `food_orders.total_price`. Laundry: the `p_subtotal` argument of `process_laundry_payment_new`, stored in `laundry_orders.total_price`. One canonical figure per service, taken from the capture function's own parameter (AC-8) |
| `grand_total` | Server at initiate-payment: `goods_total + dispatch_fee` (AC-8) |
| `amount_due_vendor` | Server inside `process_food_payment` / `process_laundry_payment_new`: `round(goods_total x (1 - food_commission_rate))` (AC-9) |
| `amount_due_dispatch` | Server, written onto the `delivery_orders` row: `round(dispatch_fee x (1 - delivery_commission_rate))` (AC-9) |
| `rider_id` | Customer's pick in the cart rider sheet, carried in the initiate-payment payload (AC-5, AC-11) |
| `dispatch_id` | `profiles.dispatcher_id` of the chosen rider, verified to have an `ACCEPTED` row in `vendor_dispatch_connections` for this vendor (AC-5, AC-12) |
| `connection_status` in the directory | `vendor_dispatch_connections.status` for the `(vendor_id, dispatch_id)` pair (AC-3) |
| online rider count | Count of that dispatch's `profiles` rows with `is_online = true`, `is_blocked = false` (AC-1, AC-6) |
| `dispatch_average_rating` | Computed: `AVG(rider.average_rating)` over that dispatch's rider rows where `review_count > 0`, same as the `dispatch_stats` CTE inside `get_available_riders`. **Not a column.** `profiles.dispatch_average_rating` does not exist (AC-1, AC-3) |
| `dispatch_rider_count` | Computed: `COUNT` of that dispatch's rider rows. The column `profiles.dispatch_total_riders` exists but is maintained separately and may drift, so it is not used (AC-1, AC-3) |
| rider `average_rating` | `profiles.average_rating`, surfaced by `get_available_riders` as `rider_rating` and remapped (AC-5) |
| rider `name`, `image` | `get_available_riders` returns `full_name` and `profile_image_url` directly; no second lookup needed (AC-5) |
| rider distance | `distance_km` returned by `get_available_riders`, computed there with `ST_Distance` from the vendor's `pickup_coordinates` passed as `near_lat` / `near_lng`. Straight line is correct for rider proximity (AC-5) |
| `quoted_fee` at payment | The `delivery_fee` the server returned from `POST /delivery/quote`, echoed back by the client. The server recomputes from `distance_km` and compares (AC-7) |
| `duration` on the delivery | The `duration` the Mapbox route produced, returned by the quote and re-sent at payment. `delivery_orders.duration` is nullable, so a missing value is not fatal (AC-7) |
| `pickup_coordinates` | Vendor `profiles.location_coordinates`, copied onto the order then onto the delivery (AC-11) |
| `dropoff_coordinates` | Customer address sheet, stored on `food_orders.dropoff_coordinates` / `laundry_orders.dropoff_coordinates`, copied onto the delivery (AC-11) |
| `receiver_phone` on the delivery | Customer `profiles.phone_number` (AC-11) |
| `pickup_location` on the delivery | vendor `profiles.business_address` (AC-11) |
| `destination` on the delivery | `food_orders.destination` / `laundry_orders.destination` (AC-11) |
| `package_name` on the delivery | Server derived: `Food order #<order_number>`, `NOT NULL` column (AC-11) |
| `order_number` on the delivery | `nextval('delivery_orders_order_number_seq')`, no column default (AC-11) |
| delivery `tx_ref` | Server generated, unique, `DELIVERY-FOOD-<order_uuid>` or `DELIVERY-LAUNDRY-<order_uuid>`, distinct from the food `tx_ref` (AC-11) |
| `delivery_order_id` on the order | Server: id returned by the `delivery_orders` insert (AC-11) |
| rider availability | **Before the charge:** layer A in Python plus a read-only layer B, failure is `409` with the exact AC-12 string and nothing created. **At capture:** layer A re-run, layer B inside `assign_rider_to_delivery`; failure parks the delivery in `PAID_NEEDS_RIDER` instead of failing (AC-12) |
| customer DEBIT amount | `grand_total` on the food/laundry `tx_ref`, row 1 of the ledger set, written once by the capture function (AC-10) |
| vendor CREDIT amount | `grand_total` stored in `transactions.amount`, but `get_user_transactions` reads `net_amount` from `food_orders.amount_due_vendor` / `laundry_orders.amount_due_vendor`, so the vendor is shown the correct figure (AC-9, AC-10) |
| dispatch CREDIT amount | `transactions.amount = dispatch_fee` on the delivery `tx_ref`, `order_id = delivery_orders.id`, `order_type = 'DELIVERY'`. **`get_user_transactions` reads `net_amount` from `delivery_orders.amount_due_dispatch`**, so that column must be correct or the dispatch sees the wrong Pending figure. Written `ESCROW_HOLD` at payment, `ESCROW_RELEASE` at completion, `released_at` at bank `SUCCESSFUL` (AC-10) |
| cancel refund amount | `grand_total` in full, through `refund_service.refund_customer_payment`; rows 3 and 5 of the ledger set are deleted (AC-15) |
| notification recipients | The two matrices in the Notifications section: involved parties minus the actor. Fanned out by calling `enqueue_notification_task_gct` once per recipient (AC-19) |
| push token | `push_tokens.token` for `user_id`, newest row first. Absent means the push is logged and dropped, never raised (AC-20) |
| dispatch payout amount | `delivery_orders.amount_due_dispatch`, returned by `get_order_payout_info` with `p_order_type = 'DELIVERY_ORDER'` and mapped onto `amount_due_vendor` by that branch. Enqueued by `delivery_service.py:733`, which already exists (AC-14) |
| dispatch payout beneficiary | `beneficiaries` joined on `dispatch_id`, gated before accept by AC-21. Null means the payout fails with `NO_BENEFICIARY` and the row goes `FAILED`, which is claimable (AC-14, AC-21) |
| payout account for the gate | `beneficiaries.account_number` and `beneficiaries.bank_code` for `id = dispatch_id`, both required because `ensure_pending_payout_row` raises `400 "Payee has no saved payout account"` when they are empty and `payouts` stores both as `NOT NULL` (AC-21) |
| held payout state | `payouts.status = 'PENDING'` with `complete_message` carrying the hold reason and `meta` carrying the fraud reference; `requires_approval` / `is_approved` left at their `DEFAULT false`. The row is created by `ensure_pending_payout_row` even when `hold_payout` is true, and only the enqueue is skipped (AC-22) |
| vendor payout amount | `food_orders.amount_due_vendor` / `laundry_orders.amount_due_vendor`, unchanged, fired from the existing confirm path (AC-14) |
| `payout_to` for the dispatch | The existing literal `VENDOR`, because `get_order_payout_info` maps `vendor_id := delivery_orders.dispatch_id` for `DELIVERY_ORDER` (AC-14) |

### Critical test scenarios

| # | Scenario | AC |
|---|---|---|
| T1 | Vendor sends a request, row is `PENDING`, a second request for the same pair returns `409` | AC-1, AC-16 |
| T2 | A non vendor account gets `403` on the directory and on sending a request | AC-1, AC-18 |
| T3 | Dispatch accepts, vendor sees `ACCEPTED`; dispatch declines with a note, vendor sees `DECLINED` and the note | AC-2, AC-3 |
| T4 | A customer calling the riders endpoint for a vendor with no accepted connection gets an empty list, and the cart hides Dispatch | AC-6, AC-18 |
| T5 | Riders are returned only from accepted connections, sorted by distance, with dispatch name and rating present, and the ratings are real values rather than the zero defaults the current `/users/available-riders` mapping loses | AC-5 |
| T6 | Quote computes `base + per_km x distance_km` from the route distance the client sends; payment recomputes from the same distance and rejects a fee differing by more than `0.01`, and rejects `distance_km` outside `(0, 100]` | AC-7, AC-8 |
| T7 | Split ledger: `amount_due_vendor` from goods only, `amount_due_dispatch` from the fee only, platform takes both remainders | AC-9 |
| T8 | After payment exactly one customer DEBIT row exists for the order, and no delivery row debits the customer | AC-10 |
| T9 | Payment succeeds, `delivery_orders` row exists with an `order_number`, `food_orders.delivery_order_id` points at it, chosen rider is assigned and `has_delivery` is now true | AC-11 |
| T10 | Rider goes offline between quote and `initiate-payment`, the pre-charge availability check fails, the client sees `409` with `That rider is no longer available. Please choose another.`, no charge is taken and no order is created | AC-12 |
| T11 | Cancelling before pickup cancels the linked delivery, releases the rider, refunds `grand_total` in full, deletes the dispatch CREDIT and the delivery `platform_commissions` row, writes no dispatch payout | AC-15 |
| T12 | Delivery creation failure leaves the paid order intact and queued for retry | AC-17 |
| T13 | Disconnect severs new visibility but leaves an assigned delivery running to completion | AC-4 |
| T14 | Courier create, quote, assign and complete paths behave exactly as before this change | AC-16 |
| T15 | Rider vanishes after the charge but before capture finishes: the order and delivery row both survive, `delivery_status = 'PAID_NEEDS_RIDER'`, no refund is issued, and the AC-17 endpoint lets the customer assign a new rider using the stored fee | AC-11, AC-12, AC-17 |
| T16 | The chosen rider declines: delivery becomes `DECLINED`, `has_delivery` clears, the customer is notified and picks again | AC-11, AC-17 |
| T17 | `delivery_orders.amount_due_dispatch` drives the dispatch's Pending figure, not `transactions.amount`: point row 3 at the delivery order id and assert the dispatch is shown `amount_due_dispatch` | AC-9, AC-10 |
| T18 | A scheduled order paid hours early notifies nobody until `scheduled_at`, while the rider can already see the job | AC-13 |
| T19 | A non owner calling `POST /orders/{id}/assign-delivery` gets `403` | AC-17, AC-18 |
| T20 | Sending a connection request enqueues exactly one push, to the dispatch, and none to the vendor who sent it; accepting enqueues exactly one, to the vendor, and none back to the dispatch | AC-2, AC-19 |
| T21 | Assignment enqueues a push to the rider; a decline enqueues one to the customer and one to the vendor; `PAID_NEEDS_RIDER` enqueues to the customer and vendor | AC-11, AC-19 |
| T22 | For each status in the matrix, assert the exact recipient set, including that the acting party is excluded. Run it once with `expanded=True` and once with the default to prove courier recipients did not move | AC-16, AC-19 |
| T23 | Completion enqueues two transfers, one `FOOD_ORDER`/`LAUNDRY_ORDER` paying `amount_due_vendor` and one `DELIVERY_ORDER` paying `amount_due_dispatch`, with two distinct `payouts` references. A dispatch with no `beneficiaries` row fails with `NO_BENEFICIARY` without failing the delivery | AC-14 |
| T24 | A user with no `push_tokens` row produces a `push_notification_no_token` log and no exception, and the event is still visible on the relevant screen | AC-20 |
| T25 | A dispatch with no payout account receives a request, but `accept` returns `409`; the directory marks it and the inbox explains it; after adding an account the same request accepts | AC-21 |
| T26 | Fraud returns `REVIEW` at completion: the delivery completes, a `payouts` row exists as `PENDING` with the hold reason in `complete_message`, no transfer is enqueued, and the manual payout path accepts the row. `BLOCK` still refuses completion outright | AC-22 |
| T27 | A dispatch that deletes its beneficiary after accepting: completion succeeds, the payout row goes `FAILED`, and `POST /payouts/{transfer_id}/retry` releases it once the account is re-added | AC-14, AC-21 |
| T28 | The branch matrix, asserted for the restaurant radios and the laundry chips alike: flag on renders *Pickup from Store* + *Vendor Delivery* and never *External delivery* even with riders online; flag off with a reachable rider renders *Pickup from Store* + *External delivery* and never *Vendor Delivery*; flag off with no rider renders *Pickup from Store* alone | AC-5, AC-6 |
| T29 | `VENDOR_DELIVERY` with the flag off returns `400 "This vendor does not offer delivery"`, and `DISPATCH_DELIVERY` with the flag on returns `400` | AC-5 |
| T30 | `DISPATCH_CHECKOUT_ENABLED=false`: the riders endpoint returns `[]`, the quote endpoint returns `404`, and `resolveDeliveryMethods` yields `["PICKUP"]` for a vendor with delivery off and riders online. Flipping the flag back restores the option with no other change | AC-23 |

## Build plan

Default approach: **end to end slices**, thinnest working path first. `AGENTS.md` now records the repo conventions.

**Slice 0 · Gates, no behaviour change** (AC-5, AC-23)

Ships on its own and changes nothing observable. Each task only deletes a future failure.

1. Widen `Literal["PICKUP", "VENDOR_DELIVERY"]` to include `DISPATCH_DELIVERY` in `app/schemas/food_schemas.py:192` (`CheckoutRequest`) and `app/schemas/laundry_schemas.py:154` (`LaundryOrderCreate`). Without this `/initiate-payment` returns `422` and checkout dies, because these are the request models on `food_router.py:188` and `laundry_route.py:71`
2. Read `DISPATCH_CHECKOUT_ENABLED` from settings, default true, and gate `GET /dispatch/riders` and `POST /delivery/quote` behind it
3. Freeze the signatures of `process_food_payment` and `process_laundry_payment_new`. Both already have more than one live overload, so adding a parameter would silently create a third instead of taking effect; replace the body in place following the `pg_get_functiondef` load-assert-replace pattern in `migrations/025_fix_capture_vendor_amounts.sql`
4. Add a pytest step to `cloudbuild.yaml` so the 55 existing tests gate every deploy. It currently runs build, push, deploy with no test step at all

**Slice 1 · Connections, no money** (AC-1, AC-2, AC-3, AC-4, AC-16, AC-18, AC-21)

5. Migration: `vendor_dispatch_connections` with the `CHECK`, unique pair and indexes
6. `app/services/dispatch_connection_service.py` + `app/routes/dispatch_connection_route.py`: directory, send, list, accept, decline, disconnect
7. Payout account gate on accept: check `beneficiaries` for `account_number` and `bank_code` and return `409` with an actionable message when absent. `POST /api/v1/beneficiaries` is left untouched, since it already accepts a DISPATCH account
8. Connection notifications: push to the dispatch when a request arrives, to the vendor when it is answered or a partner disconnects, fanned out one `enqueue_notification_task_gct` call per recipient
9. Vendor screens: connections list plus a discover directory (`app/dispatch-connections/`), including the not yet payable marker
10. Dispatch inbox screen with accept and decline (`app/dispatch-requests/`), showing the missing account state and a link to add one
11. Vendor profile entry point beside the existing Dispatch link in `app/(tabs)/profile/index.tsx`

**Slice 2 · Riders and quote visible at checkout** (AC-5, AC-6, AC-7)

12. `GET /dispatch/riders`: call the existing `get_available_riders` RPC with the vendor's pickup coordinates, filter to `ACCEPTED` connections in Python, remap the RPC's rating column names. No RPC change
13. `POST /delivery/quote` accepting the client's Mapbox `distance_km` and `duration`, validating bounds and recomputing the fee
14. Cart: rebuild the Delivery Method block on `can_pickup_and_dropoff` so *Pickup from Store* always renders, *Vendor Delivery* only when the flag is on and *External delivery* only when it is off with a rider reachable, replacing the forced single radio at `app/cart.tsx:832`. Restaurant radios and laundry chips follow the same rule, the address sheet condition moves off `PICKUP && !can_pickup_and_dropoff`, plus the rider list sheet showing dispatch name and rating, the fee row, and Mapbox route distance fed into the quote. `lib/delivery-options.ts` already holds this rule and is covered by `__tests__/delivery-options.test.ts`, so wire the cart to it rather than re-deriving the branch in JSX
15. `api/dispatch.ts` client plus `DISPATCH_DELIVERY` added to `RequireDelivery` in `types/order-types.ts`

**Slice 3 · Payment and the ledger** (AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)

16. Migration: new `process_food_payment` and `process_laundry_payment_new` splitting the buckets, branched on `delivery_option = 'DISPATCH_DELIVERY'`, plus the row 3 and row 5 inserts
17. `food_service.py` / `laundry_service.py`: layer A plus read-only layer B at `initiate-payment`, the `quoted_fee` comparison, the distance bounds, and rejection of `DISPATCH_DELIVERY` when `can_pickup_and_dropoff = true` to mirror the `400` the flag already produces for `VENDOR_DELIVERY`
18. Capture path: create the `delivery_orders` row with `order_number = nextval(...)` and its own `tx_ref`, write `delivery_order_id`, re-run layer A, then call `assign_rider_to_delivery(p_tx_ref, p_rider_id)` so layer B runs atomically
19. If that assign raises, catch it inside the capture transaction, keep the order and delivery, set `delivery_status = 'PAID_NEEDS_RIDER'`, notify the customer and vendor to re-pick. Never roll back money
20. `POST /orders/{order_id}/assign-delivery`, order owner only, reusing the stored fee

**Slice 4 · Lifecycle glue** (AC-4, AC-13, AC-14, AC-15, AC-17, AC-19, AC-22)

21. Add the optional `schedule_time` parameter to `enqueue_notification_task_gct`, and hold the travel notification for scheduled orders
22. Add `expanded: bool = False` to `app/common/order.py:_send_delivery_notifications` and implement the full recipient matrix behind it, leaving every courier call site untouched
23. READY notification to the rider, pickup through the existing RPC, which sets `had_escrow = true`
24. Rider decline: flip to `DECLINED`, clear `has_delivery`, notify the customer to re-pick
25. Cancel propagation from `app/common/order.py:_handle_cancellation` into the linked delivery, with the full `grand_total` refund and deletion of rows 3 and 5
26. `get_order_details` gains rider and dispatch fields; show them on the order screen and receipt
27. Dead letter retry for delivery creation
28. Held payout row: in `complete_delivery`, call `ensure_pending_payout_row` before the `hold_payout` branch and skip only `enqueue_transfer_task_gct` when held, writing the reason to `complete_message` and the fraud reference to `meta`
29. Verify, with no new code, that `amount_due_vendor` fires from `app/common/order.py:214` and `amount_due_dispatch` from `delivery_service.py:733`, and that both resolve distinct `payouts` references
30. Disconnect changes nothing about deliveries already assigned, so an in flight job always runs to completion

**Slice 5 · Hardening** (AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23)

31. Backend tests for connection guards, the five row ledger, the two failure timings, the recipient matrix, the delivery method branch, the accept gate, the kill switch and the held payout, against scenarios T1 to T30
32. Empty and error states for every new screen

## Consequences

- The rider waits at the store for the food to be ready, because they travel immediately after payment. Dispatch companies absorb that idle time. If it becomes a problem the fix is to hold the travel notification until the vendor marks the order ready, which is a small change to one notification.
- Two commission rates now apply to two separate buckets on one order, so any future change to commission has to keep both in mind.
- `delivery_orders` gains rows that are not courier orders. Anything reading that table by `order_type` must keep working, which is why the existing courier value is left alone.
- The platform is the only party that sees both ledgers. Reconciliation reports need to join on `delivery_order_id` to see the whole order.
- Because the rider is assigned at payment and travels immediately, the rider may arrive before the food is ready. Idle time at the store is a cost the dispatch company carries.
- Rider availability is now checked at two different times with two different outcomes, `409` before the charge and `PAID_NEEDS_RIDER` after it. Any future change to availability has to preserve that asymmetry, because the customer can only act on one of them by retrying payment.
- `PAID_NEEDS_RIDER` and `DECLINED` become states a food order can sit in for an unbounded time. Anything that lists orders needing attention has to include them.
- Push is the only notification channel and it is best effort: no token means no message and no retry. Every event in the matrix therefore has to be discoverable by opening a screen, which is why the dispatch inbox and the order detail screen are load bearing rather than convenient.
- The recipient matrix is now a contract. Adding a party later means editing one table, and the courier matrix stays frozen behind `expanded=False`, so courier behaviour only changes when someone deliberately changes that default.
- A payout account becomes a prerequisite for the partnership rather than a payout time detail. A dispatch that has not added banking is fully discoverable but cannot be accepted, which is a deliberate trade of reach for certainty that money will move.
- Fraud review now leaves a durable `payouts` row instead of a log line, so held money is visible and releasable. Anyone changing `complete_delivery` must keep creating that row when `hold_payout` is true, otherwise held payouts silently become invisible again.
- `can_pickup_and_dropoff` stops being purely a pricing switch and becomes the selector for which delivery option a customer sees. Toggling it changes the checkout for every future order, and a vendor cannot run their own drivers and dispatch riders at the same time.

## Follow-up

- **The inverted commission formulas were already fixed by migration `025_fix_capture_vendor_amounts.sql`.** Food, laundry, delivery and product all used to store the platform cut in `amount_due_vendor` instead of the payee's net. The live definitions now read `x (1 - commission_rate)`. Nothing to do here, but it is the reason the numbers in this spec use `x (1 - rate)` and the reason `delivery_orders` sitting at zero rows does not mean the courier money path is untested for its formula.
- **Courier capture cannot insert a row.** `delivery_orders.order_number` is `bigint NOT NULL UNIQUE` with no column default, and `process_delivery_payment` does not supply one (verified: the function body never mentions `order_number`). Every courier capture therefore fails at insert, which is consistent with `delivery_orders` holding zero rows. Supply `nextval('delivery_orders_order_number_seq')` there too.
- **`user_service.py:559` selects columns that do not exist** (`dispatch_average_rating`, `dispatch_review_count` on `profiles`), so the dispatch stats lookup in the rider detail path errors. The dispatch rating is an aggregate over rider rows, not a column.
- **`/users/available-riders` loses its ratings.** The RPC returns `rider_rating`, `rider_reviews` and `dispatch_avg_rating`, but `AvailableRiderResponse` expects `average_rating`, `review_count` and `dispatch_average_rating`, so Pydantic fills defaults and every rating comes back as `0`. Our endpoint does its own remapping rather than touching the shared schema.
- Marketplace products and reservations are out of scope; product checkout already has its own `shipping_cost` path.
- `payout_to='CUSTOMER'` refunds on delivered orders have no CREDIT row to release, a gap already noted in the pending payout work.
- Rider waiting time metrics, if dispatch companies start asking about them.
- The broken `POST /users/set-pickup-dropoff` route (`user_service.py:943` always writes `is_online`) is unrelated but worth fixing while in this area.

## Options considered

**Where the rider link lives.** Putting `rider_id` and `dispatch_id` on `food_orders` and `laundry_orders` would have kept every read on one table, but it forks the delivery state machine: two places that can assign a rider, two places that track status, and two things to keep in sync when one is cancelled. Adding `source_order_id` to `delivery_orders` instead keeps one owner but forces every food screen to query backwards. The chosen option, `delivery_order_id` on the order, leaves `delivery_orders` untouched so the courier flow cannot regress, and gives the order screens a forward join.

**Who prices the delivery.** The vendor's flat `pickup_and_delivery_charge` is simple but the vendor would be setting a price for a service they do not perform, and it carries no distance signal. Letting each dispatch publish a rate card needs a new table, a quote endpoint per dispatch, and a way to compare them. Pricing from `charges_and_commissions` reuses the one config row the courier flow already reads, so a single change to delivery pricing moves both paths together.

**How the customer's fee reaches the ledger.** Writing a second customer DEBIT for the delivery would show the customer two charges for one food order, and dedupe by order id would then have to hide it, which is fragile. Debiting only for the goods and crediting only the dispatch leaves the customer with one row that matches what they were charged, and the split is carried by the two payee rows instead. Balance is therefore checked per order through `delivery_order_id` rather than per `tx_ref`, which is why each row names the side it belongs to.

**When the rider moves.** Holding the rider until the order is ready avoids idle waiting but delays delivery and needs the vendor to trigger it. Offering the job only at ready time risks the chosen rider being gone. Assigning and sending immediately after payment puts the waiting cost on the dispatch company but keeps the customer's choice intact and reuses the courier rhythm exactly.

**What happens when assignment fails after the charge.** Rolling the capture back is impossible, because Flutterwave has already taken the money and reversal is slow and can itself fail. Auto refunding puts a second failure mode on the critical path and throws away a perfectly valid paid order. Parking the order in `PAID_NEEDS_RIDER` and letting the customer choose again keeps the money where it is, reuses the status the `CHECK` already allows, and turns an outage into a retry the customer controls. The cost is a moment where the customer has paid and has no rider, which is why the notification for that state is mandatory rather than optional.

**Whether to keep the dispatch fee on cancel.** Keeping it would act as a cancellation fee, but at the moment this path allows cancellation no rider has travelled and no vendor has cooked, so charging for a delivery that never happened would be hard to defend. Full refund of `grand_total` means the goods commission row has to go too, which is why both rows are deleted rather than zeroed.

**Where the connection code lives.** Row level security policies keep it in the database but scatter the role rules across policy definitions that are easy to get subtly wrong. Postgres RPCs put the guards closest to the data but add SQL to maintain alongside the Python. FastAPI routes with `require_user_type` guards match how dispatch manages riders today, so the rules live in one reviewable place.

**Whether External delivery sits alongside Vendor Delivery.** Drawing it as a third option for every vendor would let a self delivering company also hand work to a dispatch, but then one checkout has two possible fee owners and two pricing rules, and the customer has to understand a choice the vendor has already effectively made. Making them mutually exclusive on `can_pickup_and_dropoff` keeps exactly one fee owner per order, the vendor or the dispatch and never both, and it reuses the toggle vendors already use to say whether they deliver. The cost is that turning delivery off is what unlocks the feature, and that a vendor cannot mix their own drivers with dispatch riders, which is a deliberate limitation rather than an oversight.

## Rationale

Chosen for reuse over novelty: the partnership is one small table, the fulfilment path is your existing rider state machine, and pricing reuses the commission config you already run for courier. The alternative of adding rider columns to the order tables would have forked the delivery state machine and made two places where a rider can be assigned.

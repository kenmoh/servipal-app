<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Servipal app. The project already had `posthog-react-native` installed and partial instrumentation in place. The integration was completed and extended with the following changes:

- **`app/_layout.tsx`** — Added a `ScreenTracker` component (using `usePostHog`, `usePathname`, `useGlobalSearchParams`) placed inside `PostHogProvider` to automatically track every screen navigation via `posthog.screen()`. Also imported `useRef` and the new expo-router hooks.
- **`.env`** — Confirmed and updated `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` with the correct project values.
- **`hooks/user-sign-in.ts`** — `posthog.identify()` on successful login (with `email`, `user_type`, `$set_once` first sign-in date). `sign_in` and `sign_in_failed` events with relevant properties.
- **`app/send-package/package-info.tsx`** — `delivery_order_submitted` (with `distance_km`, `amount`, `package_name`) on success; `delivery_order_failed` (with `error_message`) on error.
- **`app/payment/index.tsx`** — `payment_completed` (with `tx_ref`, `status`, `amount`, `service_type`, `currency`) on Flutterwave redirect.
- **`app/store/[storeId]/create-reservation.tsx`** — `reservation_created` (with `vendor_id`, `party_size`, `serving_period`, `reservation_date`, `deposit_amount`) on success; `reservation_failed` on error.
- **`app/wallet/add-payout-account.tsx`** — `payout_account_created` on successful bank account creation.
- **`app/sign-up.tsx`** — `sign_up` (with `userType`) via `useTrack` hook on form submit.
- **`app/cart.tsx`** — `order_created` (food/laundry orders) via `useTrack` hook.
- **`app/product-detail/purchase-summary.tsx`** — `purchase_summary` on screen view, `order_success` and `order_failed` via `useTrack` hook.

## Events

| Event | Description | File |
|---|---|---|
| `sign_in` | User successfully signs in. Also triggers `posthog.identify()` with user ID, email, and user type. | `hooks/user-sign-in.ts` |
| `sign_in_failed` | User sign-in attempt failed (wrong credentials, unverified email, etc.) | `hooks/user-sign-in.ts` |
| `delivery_order_submitted` | User successfully submits a package delivery request and proceeds to payment | `app/send-package/package-info.tsx` |
| `delivery_order_failed` | Package delivery order submission failed | `app/send-package/package-info.tsx` |
| `payment_completed` | User completes Flutterwave payment for any service type (DELIVERY, FOOD, LAUNDRY, PRODUCT, RESERVATION) | `app/payment/index.tsx` |
| `reservation_created` | User successfully creates a restaurant table reservation intent and proceeds to payment | `app/store/[storeId]/create-reservation.tsx` |
| `reservation_failed` | Restaurant reservation creation failed | `app/store/[storeId]/create-reservation.tsx` |
| `payout_account_created` | Vendor/user successfully adds a bank payout account | `app/wallet/add-payout-account.tsx` |
| `sign_up` | User completes registration form and submits (tracks `user_type`) | `app/sign-up.tsx` |
| `order_created` | Food or laundry cart order successfully placed | `app/cart.tsx` |
| `order_success` | Marketplace product order successfully initiated | `app/product-detail/purchase-summary.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/373998/dashboard/1533078
- **User Acquisition Funnel** (sign_up → sign_in): https://us.posthog.com/project/373998/insights/78Ulp2xD
- **Order Completion Funnel** (sign_in → order_created → payment_completed): https://us.posthog.com/project/373998/insights/uQGIf2ir
- **Payment Completed over time** (broken down by service type): https://us.posthog.com/project/373998/insights/UCv72sxC
- **Sign-in Failure Rate** (successful vs failed sign-ins): https://us.posthog.com/project/373998/insights/0Is19tsi
- **Reservation Conversion** (created vs failed): https://us.posthog.com/project/373998/insights/qt3YQd4W

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

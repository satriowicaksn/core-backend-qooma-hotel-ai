// Checkout derivation (V4). Standard hotel day: check-in 13:00 local, check-out
// 11:00 local. Checkout falls on (check-in calendar date + nights) at 11:00 in the
// hotel-local timezone. No per-hotel TZ is modelled (Hotel is id-only), so the
// timezone is injected — wiring passes config.TZ (GAP T16-#3 seam).

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

// `dayjs.extend(...)` is the canonical plugin-registration idiom; the default
// import is the intended receiver (not the same-named `extend` named export).
/* eslint-disable import/no-named-as-default-member */
dayjs.extend(utc);
dayjs.extend(timezone);
/* eslint-enable import/no-named-as-default-member */

const CHECKOUT_HOUR = 11;

export function deriveCheckout(checkIn: Date, nights: number, tz: string): Date {
  return dayjs(checkIn)
    .tz(tz)
    .add(nights, 'day')
    .hour(CHECKOUT_HOUR)
    .minute(0)
    .second(0)
    .millisecond(0)
    .toDate();
}

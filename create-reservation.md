Design a modern reservation booking interface for a restaurant app.

The screen should allow users to:

1. Select a date
2. Select party size
3. View and select available time slots(call getAvailableSlots api)

---

## Layout Structure

### Header

- Restaurant name
- Back button
- Optional: restaurant image banner

---

### Section 1: Date Selection

- Horizontal scrollable date picker(as we have in cart.tsx)
- Show:
  - Day (Mon, Tue…)
  - Date (12, 13…)

- Highlight selected date
- Disable past dates

---

### Section 2: Party Size

- Dropdown or pill selector
- Options: 1–10+
- Label: “Number of guests”

---

### Section 3: Available Time Slots

- Grid layout (2–3 columns)
- Each slot is a rounded button:
  - Example: “10:00 AM”

- Selected slot should be highlighted
- Disabled slots should appear faded

---

### Section 4: Reservation Info (Dynamic)

- Show when a slot is selected:
  - Reservation duration (e.g. 1 hr)
  - Deposit required
  - Cancellation policy (short summary)

---

### CTA Button

- Fixed at bottom
- Label: “Reserve Now(deposit_amount)”
- if the current user is the restaurant owner, disable the button
- Disabled until:
  - date selected
  - party size selected
  - slot selected

---

## UX Behavior

- When date or party size changes:
  → Fetch and refresh available slots

- Show loading state when fetching slots:
  → spinner

- If no slots available:
  → Show empty state:
  “No available times for this date”

---

## Visual Style

- Clean design
- Primary color for active states
- maintain our clean premium theme
- Smooth transitions (fade/scale)

---

## Optional Enhancements

- Tag popular times: “Fast filling”
- Show “Only 2 tables left” (urgency)

---

## Data Integration

The time slots should be populated dynamically from:
get_available_reservation_slots API

Each slot contains:

- start_time
- end_time

Display only start_time in UI.

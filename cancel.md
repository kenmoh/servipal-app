# Let's work on cancelDeliveryOrder. (Use existing functions(rpc) where possible or create new functions if needed and efficient or update existing functions if needed)

- Rider and Sender can cancel delivery.

## Rider Cacellation(What should happen):

## IN PROFILE

- set rider_is_suspended_for_order_cancel to true
- increment rider_cancelled_orders_count by 1
- set has_delivery to false

## IN DELIVERY ORDER

- set rider_phone_number to null
- set rider_id to null
- set rider_id to null
- set dispatch_id to null

## IN WALLET

- remove amount delivery_fee from the dispatch escrow_balance
- credit the sender escrow_balance with the delivery_fee

## Sender Cacellation(What should happen):

## IN DELIVERY ORDER

- if the order is PICKED_UP: This means the order is in transit and the rider is on the way to the destination, so the rider will have to return the package to the sender. so it should follow the normal delivery process of rider mark delivered(to the sender) and sender mark completed(when they received the package).
  - set the is_sender_cancelled to true

- Since this will follow normal delivery process, the funds will automatically be moved when the sender mark completed.

## NOTE

- for the markDeliveryCompleted, the following should happen:
  - set the rider has_delivery to false
  - set the delivery_order rider_id to null
  - set the delivery_order dispatch_id to null
  - set the delivery_order rider_phone_number to null

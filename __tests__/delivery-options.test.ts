import { resolveDeliveryMethods } from "@/lib/delivery-options";

describe("resolveDeliveryMethods", () => {
  describe("current behaviour (no rider query yet, riderCount is always 0)", () => {
    it("offers Pickup and Vendor Delivery when the vendor delivers itself", () => {
      expect(
        resolveDeliveryMethods({ canPickupAndDropoff: true, riderCount: 0 })
      ).toEqual(["PICKUP", "VENDOR_DELIVERY"]);
    });

    it("offers Pickup alone when the vendor does not deliver itself", () => {
      expect(
        resolveDeliveryMethods({ canPickupAndDropoff: false, riderCount: 0 })
      ).toEqual(["PICKUP"]);
    });
  });

  describe("rider availability", () => {
    it("never offers Dispatch to a vendor that delivers itself", () => {
      const methods = resolveDeliveryMethods({
        canPickupAndDropoff: true,
        riderCount: 5,
      });
      expect(methods).toEqual(["PICKUP", "VENDOR_DELIVERY"]);
      expect(methods).not.toContain("DISPATCH_DELIVERY");
    });

    it("offers Dispatch when the vendor does not deliver and a rider is reachable", () => {
      expect(
        resolveDeliveryMethods({ canPickupAndDropoff: false, riderCount: 1 })
      ).toEqual(["PICKUP", "DISPATCH_DELIVERY"]);
    });

    it("falls back to Pickup alone when every rider is offline or out of range", () => {
      expect(
        resolveDeliveryMethods({ canPickupAndDropoff: false, riderCount: 0 })
      ).toEqual(["PICKUP"]);
    });
  });

  describe("kill switch", () => {
    it("withholds Dispatch when disabled, even with riders online", () => {
      expect(
        resolveDeliveryMethods({
          canPickupAndDropoff: false,
          riderCount: 4,
          dispatchCheckoutEnabled: false,
        })
      ).toEqual(["PICKUP"]);
    });

    it("does not affect the vendor's own delivery option", () => {
      expect(
        resolveDeliveryMethods({
          canPickupAndDropoff: true,
          riderCount: 4,
          dispatchCheckoutEnabled: false,
        })
      ).toEqual(["PICKUP", "VENDOR_DELIVERY"]);
    });

    it("defaults to enabled", () => {
      expect(
        resolveDeliveryMethods({ canPickupAndDropoff: false, riderCount: 3 })
      ).toEqual(["PICKUP", "DISPATCH_DELIVERY"]);
    });
  });

  describe("invariants", () => {
    const cases = [
      { canPickupAndDropoff: true, riderCount: 0 },
      { canPickupAndDropoff: true, riderCount: 7 },
      { canPickupAndDropoff: false, riderCount: 0 },
      { canPickupAndDropoff: false, riderCount: 7 },
      { canPickupAndDropoff: false, riderCount: 7, dispatchCheckoutEnabled: false },
      { canPickupAndDropoff: true, riderCount: 7, dispatchCheckoutEnabled: false },
    ];

    it.each(cases)("always offers Pickup (%o)", (input) => {
      expect(resolveDeliveryMethods(input)).toContain("PICKUP");
    });

    it.each(cases)("never offers both delivery options (%o)", (input) => {
      const methods = resolveDeliveryMethods(input);
      expect(
        methods.includes("VENDOR_DELIVERY") &&
          methods.includes("DISPATCH_DELIVERY")
      ).toBe(false);
    });

    it.each(cases)("never offers no options (%o)", (input) => {
      expect(resolveDeliveryMethods(input).length).toBeGreaterThan(0);
    });
  });
});

import { fetchPayoutAccounts } from "@/api/user";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

export const usePayoutAccountGuard = () => {
  const queryClient = useQueryClient();

  const ensurePayoutAccount = useCallback(
    (onProceed: () => void) => {
      queryClient
        .fetchQuery({
          queryKey: ["payoutAccounts"],
          queryFn: fetchPayoutAccounts,
          staleTime: 0,
        })
        .then((account) => {
          if (account?.beneficiary_id) {
            onProceed();
            return;
          }
          Alert.alert(
            "Add Payout Account",
            "You need a payout account to continue. Please add your payout account.",
            [
              {
                text: "OK",
                onPress: () => router.push("/wallet/add-payout-account"),
              },
            ],
          );
        })
        .catch(() => {
          onProceed();
        });
    },
    [queryClient],
  );

  return { ensurePayoutAccount };
};
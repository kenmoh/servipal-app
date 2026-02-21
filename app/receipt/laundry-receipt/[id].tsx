import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { fetchOrderDetails, updateLaundryOrderStatus } from "@/api/order";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { DetailResponse, OrderItem } from "@/types/order-types";
import { getButtonConfig } from "@/utils/button-config";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";

const LaundryReceiptPage = () => {
  const screenWidth = Dimensions.get("window").width;
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const isDark = theme === "dark";
  const BG_COLOR = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const CARD_BG = isDark ? "bg-gray-800/40" : "bg-white";
  const TEXT_PRIMARY = isDark ? "text-white" : "text-gray-900";
  const TEXT_SECONDARY = isDark ? "text-gray-400" : "text-gray-600";
  const BORDER_COLOR = isDark ? "border-gray-700" : "border-gray-200";

  const { id } = useLocalSearchParams<{ id: string }>();
  const orderType = "LAUNDRY";

  const { data, isLoading, refetch } = useQuery<DetailResponse>({
    queryKey: ["laundry-order-details", id, orderType],
    queryFn: () => fetchOrderDetails(id, orderType),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });

  console.log("LAUNDRY ORDER", data);

  const buttonConfig = getButtonConfig(
    data?.order?.order_status!,
    data?.order?.delivery_option as "PICKUP" | "DELIVERY",
    orderType,
  );

  const generateReceiptHTML = () => {
    if (!data) return "";

    const truncateText = (text: string, maxLength: number = 150) => {
      if (!text) return "";
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    const itemsTotal = Number(data.order?.total_price || 0);
    const deliveryFee = Number(data?.order?.delivery_fee || 0);
    const total = Number(data.order?.grand_total || itemsTotal + deliveryFee);

    return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                        
                        body { 
                            font-family: 'Poppins', sans-serif;
                            padding: 40px 20px;
                            color: #1a1a1a;
                            background-color: #fcfcfc;
                            margin: 0;
                            line-height: 1.6;
                        }
                        
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 24px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 40px;
                        }

                        .header h1 {
                            color: #FF8C00;
                            margin: 0;
                            font-size: 28px;
                            font-weight: 700;
                            letter-spacing: -0.5px;
                        }

                        .business-name {
                            font-size: 18px;
                            font-weight: 600;
                            color: #333;
                            margin-top: 5px;
                        }
                        
                        .order-meta {
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                            margin-top: 8px;
                        }

                        .section { 
                            margin-bottom: 30px;
                        }
                        
                        .section h2 {
                            color: #1a1a1a;
                            margin: 0 0 15px 0;
                            font-size: 16px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        
                        .line-item { 
                            display: flex; 
                            justify-content: space-between; 
                            padding: 12px 0;
                            border-bottom: 1px solid #f0f0f0;
                        }
                        
                        .line-item:last-child {
                            border-bottom: none;
                        }
                        
                        .label {
                            color: #666;
                        }
                        
                        .value {
                            font-weight: 500;
                            color: #1a1a1a;
                        }
                        
                        .total-block { 
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 2px solid #f0f0f0;
                        }
                        
                        .grand-total {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-weight: 700;
                            font-size: 22px;
                            color: #000;
                            margin-top: 10px;
                        }
                        
                        .status {
                            display: inline-block;
                            padding: 6px 16px;
                            border-radius: 50px;
                            font-size: 12px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        
                        .status-paid {
                            background: #e6f4ea;
                            color: #1e7e34;
                        }
                        
                        .status-unpaid {
                            background: #fdeaea;
                            color: #d93025;
                        }
                        
                        .address-box {
                            background: #fcfcfc;
                            padding: 16px;
                            border-radius: 12px;
                            border: 1px solid #f0f0f0;
                            font-size: 14px;
                            margin-bottom: 15px;
                        }

                        .footer {
                            text-align: center;
                            margin-top: 50px;
                            color: #999;
                            font-size: 11px;
                            letter-spacing: 0.5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ServiPal</h1>
                            <div class="business-name">${data.order?.vendor_name || "Laundry Vendor"}</div>
                            <div class="order-meta">Laundry Order #${data.order?.order_number}</div>
                        </div>
                        
                        <div class="section">
                            <div class="line-item">
                                <span class="label">Customer</span>
                                <span class="value">${data.order?.customer_name || "User"}</span>
                            </div>
                            <div class="line-item">
                                <span class="label">Payment Status</span>
                                <span class="status status-${data.order?.order_payment_status === "SUCCESS" ? "PAID" : "UNPAID"}">
                                    ${data.order?.order_payment_status?.toUpperCase()}
                                </span>
                            </div>
                            <div class="line-item">
                                <span class="label">Date</span>
                                <span class="value">${format(new Date(data.order?.created_at || ""), "PPP")}</span>
                            </div>
                        </div>

                        ${
                          data.order?.order_items &&
                          data.order.order_items.length > 0
                            ? `
                            <div class="section">
                                <h2>Services</h2>
                                ${data.order.order_items
                                  .map(
                                    (item) => `
                                    <div class="line-item">
                                        <span>${item.quantity}X ${item.name}</span>
                                        <span class="value">₦${Number((item.sizes?.[0]?.price ?? item.price) * item.quantity).toFixed(2)}</span>
                                    </div>
                                  `,
                                  )
                                  .join("")}
                            </div>
                        `
                            : ""
                        }

                        <div class="section total-block">
                            <div class="line-item">
                                <span class="label">Subtotal</span>
                                <span class="value">₦${itemsTotal.toFixed(2)}</span>
                            </div>
                            ${
                              deliveryFee > 0
                                ? `
                                <div class="line-item">
                                    <span class="label">Delivery Fee</span>
                                    <span class="value">₦${deliveryFee.toFixed(2)}</span>
                                </div>
                            `
                                : ""
                            }
                            <div class="grand-total">
                                <span>Total</span>
                                <span>₦${total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="section">
                            <h2>Address Details</h2>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">PICKUP LOCATION</strong>
                                ${truncateText(data.delivery?.origin || "")}
                            </div>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">DROP-OFF LOCATION</strong>
                                ${truncateText(data.delivery?.destination || "")}
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for choosing ServiPal Laundry!</p>
                            <p>Computer generated receipt. Valid without signature.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
  };

  const isVendor = user?.id === data?.order.vendor_id;
  const isCustomer = user?.id === data?.order.customer_id;

  const vendorStatuses = ["PENDING", "PREPARING", "READY", "IN_TRANSIT"];
  const showVendorButton =
    isVendor && vendorStatuses.includes(data?.order?.order_status!);

  const showCustomerButton =
    isCustomer && data?.order.order_status === "DELIVERED";

  const laundryOrderMutation = useMutation({
    mutationFn: () =>
      updateLaundryOrderStatus(data?.order.id!, {
        new_status: buttonConfig.nextStatus!,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      refetch();
      showSuccess(`${data.status}`, `Order status updated to ${data.status}`);
    },
    onError: (error) => {
      showError("Error", `${error.message}`);
    },
  });

  const handleOrderStatusUpdate = () => {
    laundryOrderMutation.mutate();
  };

  const handleDownload = async () => {
    try {
      const html = generateReceiptHTML();

      const { uri } = await Print.printToFileAsync({
        html,
        width: screenWidth,
        height: screenWidth * 1.4,
        base64: false,
      });

      const receiptsDir = new Directory(Paths.document, "servipal-receipts");
      if (receiptsDir.exists) {
        receiptsDir.create({ intermediates: true });
      }

      const fileName = `SERVIPAL-LAUNDRY-${data?.order?.order_number}-${Date.now()}.pdf`;

      const sourceFile = new File(uri);
      const destinationFile = new File(receiptsDir, fileName);

      sourceFile.copy(destinationFile);

      console.log("Saved to:", destinationFile.uri);

      showSuccess("Success", "Receipt downloaded");
    } catch (error) {
      console.error(error);
      showError("Error", "Failed to download receipt");
    }
  };

  const handleShare = async () => {
    try {
      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: screenWidth,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Laundry Receipt #${data?.order?.order_number}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      showError("Error", "Failed to share receipt");
    }
  };

  if (isLoading) return <LoadingIndicator />;
  if (!data) return null;

  const { order, delivery } = data;
  const itemsTotal = Number(order?.total_price || 0);
  const deliveryFee = Number(delivery?.delivery_fee || 0);
  const total = Number(order?.grand_total || itemsTotal + deliveryFee);

  const showReviewButton = order.vendor_id !== user?.id;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 10 }}
    >
      <Stack.Screen
        options={{
          title: "Receipt",
          headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Poppins-Medium" },
          headerStyle: { backgroundColor: BG_COLOR },
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              <Pressable
                onPress={handleShare}
                className="bg-slate-600/10 p-2.5 rounded-full active:opacity-50"
              >
                <Feather
                  name="share-2"
                  size={20}
                  color={theme === "dark" ? "#eee" : "black"}
                />
              </Pressable>
              <Pressable
                onPress={handleDownload}
                className="bg-slate-600/10 p-2.5 rounded-full active:opacity-50"
              >
                <Feather
                  name="download"
                  size={20}
                  color={theme === "dark" ? "#eee" : "black"}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View
        className={`${CARD_BG} rounded-xl p-4 ${BORDER_COLOR} border shadow-sm`}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-blue-500/10 rounded-full items-center justify-center mb-4">
            <MaterialCommunityIcons
              name="washing-machine"
              size={32}
              color="#3B82F6"
            />
          </View>
          <Text className={`text-2xl font-poppins-bold ${TEXT_PRIMARY}`}>
            {order?.vendor_name || "Laundry Receipt"}
          </Text>
          <Text className={`text-sm ${TEXT_SECONDARY} mt-1`}>
            Order #{order?.order_number}
          </Text>
        </View>

        {/* Status Section */}
        <View className={`py-4 border-y ${BORDER_COLOR} mb-8 gap-4`}>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Customer</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {order?.customer_name || "User"}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Payment Status
            </Text>
            <View
              className={`${order?.order_payment_status === "SUCCESS" ? "bg-green-500/10" : "bg-red-500/10"} px-4 py-1.5 rounded-full`}
            >
              <Text
                className={`${order?.order_payment_status === "FAILED" || order?.order_payment_status === "CANCELLED" ? "text-red-600" : "text-green-600"} text-xs font-poppins-semibold uppercase`}
              >
                {order?.order_payment_status || "Pending"}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Date</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {format(new Date(order?.created_at || ""), "MMM dd, yyyy")}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        {order?.order_items && order.order_items.length > 0 && (
          <View className="mb-8">
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Services
            </Text>
            {order.order_items.map((item: OrderItem) => (
              <View
                className="flex-row justify-between items-center py-2"
                key={item.id || item.item_id}
              >
                <View className="flex-1 mr-4">
                  <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                    {item.quantity}x {item.name}
                  </Text>
                  {item.size && (
                    <Text className="text-[10px] text-gray-400 mt-0.5 uppercase">
                      {item.size}
                    </Text>
                  )}
                </View>
                <Text className={`${TEXT_PRIMARY} font-poppins-semibold`}>
                  ₦
                  {Number(
                    (item.sizes?.[0]?.price ?? item.price) * item.quantity,
                  ).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View className={`pt-6 border-t ${BORDER_COLOR} gap-3`}>
          <View className="flex-row justify-between">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Subtotal</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              ₦{itemsTotal.toFixed(2)}
            </Text>
          </View>
          {deliveryFee > 0 && (
            <View className="flex-row justify-between">
              <Text className={`${TEXT_SECONDARY} font-poppins`}>
                Delivery Fee
              </Text>
              <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                ₦{deliveryFee.toFixed(2)}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between items-center mt-2 group">
            <Text className={`${TEXT_PRIMARY} text-xl font-poppins-bold`}>
              Total Amount
            </Text>
            <Text className="text-xl font-poppins-bold text-blue-500">
              ₦{total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Instructions */}
        {order.washing_instructions && (
          <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Washing Instructions
            </Text>
            <View
              className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
            >
              <Text
                className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
              >
                {order.washing_instructions}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Details */}
        <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
          <Text
            className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
          >
            Address Details
          </Text>

          <View className="gap-6">
            <View>
              <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                Pickup Location
              </Text>
              <View
                className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
              >
                <Text
                  className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                  numberOfLines={2}
                >
                  {delivery?.origin || "Customer Address"}
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                Drop-off Location
              </Text>
              <View
                className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
              >
                <Text
                  className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                  numberOfLines={2}
                >
                  {delivery?.destination || "Vendor Location"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="items-center mt-5 gap-2">
        {showVendorButton && (
          <AppButton
            text={buttonConfig.text}
            onPress={handleOrderStatusUpdate}
            icon={
              laundryOrderMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                buttonConfig.icon
              )
            }
            variant="fill"
            borderRadius={50}
            width={"90%"}
            disabled={buttonConfig.disabled || laundryOrderMutation.isPending}
          />
        )}
        <View className="w-[90%] gap-3">
          {showCustomerButton && (
            <AppButton
              text={buttonConfig.text}
              onPress={handleOrderStatusUpdate}
              icon={
                laundryOrderMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  buttonConfig.icon
                )
              }
              variant="fill"
              borderRadius={50}
              width={"90%"}
              disabled={buttonConfig.disabled || laundryOrderMutation.isPending}
            />
          )}

          {order.order_status !== "COMPLETED" &&
            order.order_status !== "DELIVERED" &&
            order.order_status !== "CANCELLED" && (
              <AppButton
                text={"Cancel Order"}
                onPress={() =>
                  router.push({
                    pathname: "/receipt/cancel-sheet",
                    params: { id: order.id, orderType: orderType },
                  })
                }
                icon={<AntDesign name="close" size={24} color="red" />}
                variant="outline"
                borderRadius={50}
                //   width={"90%"}
                color={"red"}
              />
            )}
        </View>
        <View className="flex-row gap-6  mt-2">
          {showReviewButton && (
            <AppButton
              text="Leave a Review"
              width={"42.5%"}
              borderRadius={50}
              disabled={data?.order?.order_status !== "COMPLETED"}
              onPress={() =>
                router.push({
                  pathname: "/review/[id]",
                  params: {
                    id: order.id,
                    orderType: "LAUNDRY",
                    revieweeId: order.vendor_id,
                  },
                })
              }
            />
          )}
          <AppButton
            text="Raise Dispute"
            width={showReviewButton ? "42.5%" : "90%"}
            borderRadius={50}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/report/[id]",
                params: {
                  id: order.id,
                  orderType: "LAUNDRY",
                  revieweeId: order.vendor_id,
                },
              })
            }
          />
        </View>
      </View>
      <Text className="text-center text-[10px] text-gray-500 mt-10 font-poppins tracking-widest uppercase">
        ServiPal Laundry • Premium Care
      </Text>
    </ScrollView>
  );
};

export default LaundryReceiptPage;

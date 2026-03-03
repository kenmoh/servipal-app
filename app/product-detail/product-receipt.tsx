import { getOrderDetails } from "@/api/product";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { ProductOrder, ProductOrderItem } from "@/types/product-types";
import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Print from "expo-print";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";

const ProductReceiptPage = () => {
  const screenWidth = Dimensions.get("window").width;
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();

  const isDark = theme === "dark";
  const BG_COLOR = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const CARD_BG = isDark ? "bg-gray-800/40" : "bg-white";
  const TEXT_PRIMARY = isDark ? "text-white" : "text-gray-900";
  const TEXT_SECONDARY = isDark ? "text-gray-400" : "text-gray-600";
  const BORDER_COLOR = isDark ? "border-gray-700" : "border-gray-200";

  const { orderId } = useLocalSearchParams<{
    orderId: string;
  }>();

  const { data, isLoading } = useQuery<ProductOrder>({
    queryKey: ["product-order", orderId],
    queryFn: () => getOrderDetails(orderId!),
    enabled: !!orderId,
  });

  const generateReceiptHTML = () => {
    if (!data) return "";

    const itemsTotal =
      data.items?.reduce((acc, item) => acc + item.price * item.quantity, 0) ||
      0;
    const shippingCost = Number(data.shipping_cost || 0);
    const total = Number(data.grand_total || itemsTotal + shippingCost);

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
                            <div class="order-meta">Order #${data.order_number}</div>
                        </div>
                        
                        <div class="section">
                            <div class="line-item">
                                <span class="label">Payment Status</span>
                                <span class="status status-${data.payment_status === "SUCCESS" ? "paid" : "unpaid"}">
                                    ${data.payment_status?.toUpperCase()}
                                </span>
                            </div>
                            <div class="line-item">
                                <span class="label">Date</span>
                                <span class="value">${format(new Date(data.created_at || ""), "PPP")}</span>
                            </div>
                        </div>

                        ${
                          data.items && data.items.length > 0
                            ? `
                            <div class="section">
                                <h2>Items</h2>
                                ${data.items
                                  .map(
                                    (item) => `
                                    <div class="line-item">
                                        <span>${item.quantity}X ${item.name}${item.selected_size ? ` (${item.selected_size.join(", ")})` : ""}</span>
                                        <span class="value">₦${Number(item.price * item.quantity).toFixed(2)}</span>
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
                              shippingCost > 0
                                ? `
                                <div class="line-item">
                                    <span class="label">Shipping Cost</span>
                                    <span class="value">₦${shippingCost.toFixed(2)}</span>
                                </div>
                            `
                                : ""
                            }
                            <div class="grand-total">
                                <span>Total</span>
                                <span>₦${total.toFixed(2)}</span>
                            </div>
                        </div>

                        ${
                          data.delivery_address
                            ? `
                        <div class="section">
                            <h2>Delivery Details</h2>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">SHIPPING ADDRESS</strong>
                                ${data.delivery_address}
                            </div>
                        </div>
                        `
                            : ""
                        }
                        
                        <div class="footer">
                            <p>Thank you for choosing ServiPal!</p>
                            <p>Computer generated receipt. Valid without signature.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
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
          dialogTitle: `Receipt #${data?.order_number}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      console.error(error);
      showError("Error", "Failed to share receipt");
    }
  };

  if (isLoading) return <LoadingIndicator />;
  if (!data) return null;

  const itemsTotal =
    data.items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
  const shippingCost = Number(data.shipping_cost || 0);
  const total = Number(data.grand_total || itemsTotal + shippingCost);

  const isCustomer = user?.id === data.customer_id;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 10 }}
    >
      <Stack.Screen
        options={{
          title: "Product Receipt",
          headerTintColor: theme === "dark" ? "#eee" : "#000",
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Poppins-Medium" },
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
            </View>
          ),
        }}
      />
      <View
        className={`${CARD_BG} rounded-xl p-4 ${BORDER_COLOR} border shadow-sm`}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-orange-500/10 rounded-full items-center justify-center mb-4">
            <Feather name="file-text" size={32} color="#FF8C00" />
          </View>
          <Text className={`text-2xl font-poppins-bold ${TEXT_PRIMARY}`}>
            Product Receipt
          </Text>
          <Text className={`text-sm ${TEXT_SECONDARY} mt-1`}>
            Order #{data.order_number}
          </Text>
        </View>

        {/* Status Section */}
        <View className={`py-4 border-y ${BORDER_COLOR} mb-8 gap-4`}>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Payment Status
            </Text>
            <View
              className={`${data.payment_status === "SUCCESS" ? "bg-green-500/10" : "bg-red-500/10"} px-4 py-1.5 rounded-full`}
            >
              <Text
                className={`${data.payment_status === "FAILED" || data.payment_status === "REFUNDED" ? "text-red-600" : "text-green-600"} text-xs font-poppins-semibold uppercase`}
              >
                {data.payment_status || "Pending"}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Date</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {format(new Date(data.created_at || ""), "MMM dd, yyyy")}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        {data.items && data.items.length > 0 && (
          <View className="mb-8">
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Product Items
            </Text>
            {data.items.map((item: ProductOrderItem) => (
              <View
                className="flex-row justify-between items-center py-2"
                key={item.id}
              >
                <View className="flex-1 mr-4">
                  <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                    {item.quantity}x {item.name}
                  </Text>
                  {(item.selected_size || item.selected_color) && (
                    <Text className="text-[10px] text-gray-400 mt-0.5 uppercase">
                      {item.selected_size?.join(", ") || ""}
                      {item.selected_size && item.selected_color ? " | " : ""}
                      {item.selected_color?.join(", ") || ""}
                    </Text>
                  )}
                </View>
                <Text className={`${TEXT_PRIMARY} font-poppins-semibold`}>
                  ₦{Number(item.price * item.quantity).toFixed(2)}
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
          {shippingCost > 0 && (
            <View className="flex-row justify-between">
              <Text className={`${TEXT_SECONDARY} font-poppins`}>
                Shipping Cost
              </Text>
              <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                ₦{shippingCost.toFixed(2)}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between items-center mt-2 group">
            <Text className={`${TEXT_PRIMARY} text-xl font-poppins-bold`}>
              Total Amount
            </Text>
            <Text className="text-xl font-poppins-bold text-orange-500">
              ₦{total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Delivery Details */}
        {data.delivery_address && (
          <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Delivery Details
            </Text>

            <View className="gap-6">
              <View>
                <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                  Shipping Address
                </Text>
                <View
                  className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
                >
                  <Text
                    className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                    numberOfLines={2}
                  >
                    {data.delivery_address}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-4 justify-between my-8 mx-auto w-[90%]">
        {isCustomer &&
          !data.has_review &&
          data.order_status === "COMPLETED" && (
            <AppButton
              text="Leave a Review"
              width={"48%"}
              borderRadius={50}
              onPress={() =>
                router.push({
                  pathname: "/review/[id]",
                  params: {
                    id: data.items?.[0]?.product_id,
                    reviewType: "PRODUCT",
                    itemId: data.items?.[0]?.product_id,
                    revieweeId: data.vendor_id,
                    orderId: data.id,
                    orderType: "PRODUCT",
                  },
                })
              }
            />
          )}
        <AppButton
          text="Raise Dispute"
          width={
            isCustomer && !data.has_review && data.order_status === "COMPLETED"
              ? "48%"
              : "100%"
          }
          borderRadius={50}
          variant="outline"
          onPress={() =>
            router.push({
              pathname: "/report/[id]",
              params: {
                id: data.id,
                orderType: "PRODUCT",
                revieweeId: data.vendor_id,
              },
            })
          }
        />
      </View>

      <Text className="text-center text-[10px] text-gray-500 mt-10 font-poppins tracking-widest uppercase">
        ServiPal • Marketplace Services
      </Text>
    </ScrollView>
  );
};

export default ProductReceiptPage;

import React from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { getDeliveryDetailsById } from "@/api/delivery";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { DeliveryOrder } from "@/types/delivey-types";
import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";

const DeliveryReceiptPage = () => {
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

  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery<DeliveryOrder>({
    queryKey: ["delivery-order", id],
    queryFn: () => getDeliveryDetailsById(id),
    enabled: !!id,
  });

  const generateReceiptHTML = () => {
    if (!data) return "";

    const truncateText = (text: string, maxLength: number = 150) => {
      if (!text) return "";
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    const deliveryFee = Number(data.delivery_fee || 0);
    const amountDueDispatch = Number(data.amount_due_dispatch || 0);
    const total = Number(data.total_price || deliveryFee);

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
                            <div class="business-name">Delivery Service</div>
                            <div class="order-meta">Order #ORDN-${data.order_number}</div>
                        </div>
                        
                        <div class="section">
                            <div class="line-item">
                                <span class="label">Package</span>
                                <span class="value">${data.package_name || "Parcel"}</span>
                            </div>
                            <div class="line-item">
                                <span class="label">Payment Status</span>
                                <span class="status status-${data.payment_status === "PAID" ? "PAID" : "UNPAID"}">
                                    ${data.payment_status?.toUpperCase() || "PENDING"}
                                </span>
                            </div>
                            <div class="line-item">
                                <span class="label">Date</span>
                                <span class="value">${format(new Date(), "PPP")}</span>
                            </div>
                        </div>

                        <div class="section total-block">
                            <div class="line-item">
                                <span class="label">Delivery Fee</span>
                                <span class="value">₦${deliveryFee.toFixed(2)}</span>
                            </div>
                            <div class="grand-total">
                                <span>Total</span>
                                <span>₦${total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="section">
                            <h2>Delivery Details</h2>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">PICKUP</strong>
                                ${truncateText(data.pickup_location || "")}
                            </div>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">DROP-OFF</strong>
                                ${truncateText(data.destination || "")}
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for choosing ServiPal!</p>
                            <p>Computer generated receipt. Valid without signature.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
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
      if (!receiptsDir.exists) {
        receiptsDir.create({ intermediates: true });
      }

      const fileName = `SERVIPAL-DELIVERY-${data?.order_number}-${Date.now()}.pdf`;
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
          dialogTitle: `Delivery Receipt #${data?.order_number}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      showError("Error", "Failed to share receipt");
    }
  };

  if (isLoading) return <LoadingIndicator />;
  if (!data) return null;

  const deliveryFee = Number(data.delivery_fee || 0);
  const total = Number(data.total_price || deliveryFee);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 10 }}
    >
      <Stack.Screen
        options={{
          title: "Delivery Receipt",
          headerTintColor: theme === "dark" ? "#eee" : "#000",
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
          <View className="w-16 h-16 bg-orange-500/10 rounded-full items-center justify-center mb-4">
            <Feather name="package" size={32} color="#FF8C00" />
          </View>
          <Text className={`text-2xl font-poppins-bold ${TEXT_PRIMARY}`}>
            {data.package_name || "Parcel Receipt"}
          </Text>
          <Text className={`text-sm ${TEXT_SECONDARY} mt-1`}>
            Order #ORDN-{data.order_number}
          </Text>
        </View>

        {/* Status Section */}
        <View className={`py-4 border-y ${BORDER_COLOR} mb-8 gap-4`}>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Type</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {data.delivery_type}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Payment Status
            </Text>
            <View
              className={`${data.payment_status === "PAID" ? "bg-green-500/10" : "bg-red-500/10"} px-4 py-1.5 rounded-full`}
            >
              <Text
                className={`${data.payment_status === "PAID" ? "text-green-600" : "text-red-600"} text-xs font-poppins-semibold uppercase`}
              >
                {data.payment_status || "Pending"}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Status</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {data.delivery_status}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="mb-8">
          <Text
            className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
          >
            Package Details
          </Text>
          <View className="flex-row justify-between items-center py-2">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Package Name
            </Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {data.package_name}
            </Text>
          </View>
          {data.additional_info && (
            <View className="flex-row justify-between items-start py-2">
              <Text className={`${TEXT_SECONDARY} font-poppins`}>Info</Text>
              <Text
                className={`${TEXT_PRIMARY} font-poppins-medium flex-1 text-right ml-4`}
              >
                {data.additional_info}
              </Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View className={`pt-6 border-t ${BORDER_COLOR} gap-3`}>
          <View className="flex-row justify-between">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Delivery Fee
            </Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              ₦{deliveryFee.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mt-2 group">
            <Text className={`${TEXT_PRIMARY} text-xl font-poppins-bold`}>
              Total Amount
            </Text>
            <Text className="text-xl font-poppins-bold text-orange-500">
              ₦{total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Delivery Path */}
        <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
          <Text
            className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
          >
            Route Details
          </Text>

          <View className="gap-6">
            <View>
              <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                Origin (Pickup)
              </Text>
              <View
                className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
              >
                <Text
                  className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                  numberOfLines={2}
                >
                  {data.pickup_location}
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                Destination (Drop-off)
              </Text>
              <View
                className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
              >
                <Text
                  className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                  numberOfLines={2}
                >
                  {data.destination}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Text className="text-center text-[10px] text-gray-500 mt-10 font-poppins tracking-widest uppercase">
        ServiPal • Premium Delivery
      </Text>
    </ScrollView>
  );
};

export default DeliveryReceiptPage;

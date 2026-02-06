import React from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import { fetchOrder } from "@/api/order";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";

const ReceiptPage = () => {
  const { deliveryId: orderId } = useLocalSearchParams();
  const screenWidth = Dimensions.get("window").width;
  const theme = useColorScheme();
  const { showError, showSuccess } = useToast();

  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId as string),
  });

  const generateReceiptHTML = () => {
    if (!data) return "";

    // Function to truncate long text
    const truncateText = (text: string, maxLength: number = 150) => {
      if (!text) return "";
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    // Calculate total: sum of items total and delivery fee if present
    const itemsTotal = Number(data.order?.total_price || 0);
    const deliveryFee = Number(data.delivery?.delivery_fee || 0);
    const total = itemsTotal + deliveryFee;

    return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                        
                        body { 
                            font-family: 'Poppins', sans-serif;
                            padding: 20px;
                            color: #333;
                            background-color: #fff;
                            margin: 0;
                            line-height: 1.6;
                            height: 100vh;
                            overflow-y: auto;
                        }
                        
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            min-height: 100%;
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 2px solid #f0f0f0;
                        }

                        .logo {
                            width: 80px;
                            height: 80px;
                            margin: 0 auto 12px;
                            display: block;
                        }
                        
                        .header h1 {
                            color: #333;
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        
                        .section { 
                            margin-bottom: 25px;
                            padding: 20px;
                            background-color: #f8f9fa;
                            border-radius: 12px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        }
                        
                        .section h2 {
                            color: #444;
                            margin: 0 0 15px 0;
                            font-size: 18px;
                            font-weight: 500;
                        }
                        
                        .row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 12px;
                            padding: 8px 0;
                            gap: 5px;
                            border-bottom: 1px solid #eee;
                        }
                        
                        .row:last-child {
                            border-bottom: none;
                        }
                        
                        .row span:first-child {
                            color: #666;
                            font-weight: 400;
                        }
                        
                        .row span:last-child {
                            font-weight: 500;
                        }
                        
                        .total { 
                            font-weight: 600;
                            font-size: 1.1em;
                            color: #000;
                            background-color: #f0f0f0;
                            padding: 10px;
                            border-radius: 6px;
                            margin-top: 10px;
                        }
                        
                        .status-paid {
                            color: #28a745;
                            font-weight: 600;
                        }
                        
                        .status-unpaid {
                            color: #dc3545;
                            font-weight: 600;
                        }
                        
                        .amount {
                            font-family: 'Poppins', monospace;
                            font-weight: 600;
                        }

                        .address-info {
                            display: flex;
                            flex-direction: column;
                            gap: 4px;
                            margin-bottom: 12px;
                        }

                        .address-label {
                            font-weight: 600;
                            color: #666;
                            font-size: 13px;
                        }

                        .address-value {
                            color: #4a4a4a;
                            font-size: 13px;
                            line-height: 1.4;
                            word-wrap: break-word;
                            overflow-wrap: break-word;
                            max-width: 100%;
                            padding: 8px;
                            background-color: #fff;
                            border-radius: 6px;
                            border: 1px solid #eee;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 2px solid #f0f0f0;
                            color: #666;
                            font-size: 12px;
                        }
                        
                        @media print {
                            body {
                                padding: 0;
                            }
                            .section {
                                break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            
                            <h1>Receipt</h1>
                        </div>
                        
                        <div class="section">
                            <div class="row">
                                <span>Order Number</span>
                                <span>#${data.order?.order_number}</span>
                            </div>
                            <div class="row">
                                <span>Date</span>
                                <span>${format(
                                  new Date(data.delivery?.created_at || ""),
                                  "PPP",
                                )}</span>
                            </div>
                            ${
                              data.order?.order_items &&
                              data.order.order_items.length > 0
                                ? `
                                <div class="row">
                                    <span>Items Total</span>
                                    <span class="amount">₦${itemsTotal.toFixed(
                                      2,
                                    )}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              data.delivery?.delivery_fee
                                ? `
                                <div class="row">
                                    <span>Delivery Fee</span>
                                    <span class="amount">₦${deliveryFee.toFixed(
                                      2,
                                    )}</span>
                                </div>
                            `
                                : ""
                            }
                            <div class="row total">
                                <span>Total Amount</span>
                                <span class="amount">₦${total.toFixed(2)}</span>
                            </div>
                            <div class="row">
                                <span>Payment Status</span>
                                <span class="status-${
                                  data.order?.order_payment_status === "paid"
                                    ? "paid"
                                    : "unpaid"
                                }">
                                    ${data.order?.order_payment_status?.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        ${
                          data.order?.order_items &&
                          data?.order?.order_type !== "package" &&
                          data.order.order_items.length > 0
                            ? `
                            <div class="section">
                                <h2>Order Items</h2>
                                ${data.order.order_items
                                  .map(
                                    (item: any) => `
                                    <div class="row">
                                        <span>${item.quantity}X  ${
                                          item.name
                                        }</span>
                                        <span class="amount">₦${Number(
                                          item.price * item.quantity,
                                        ).toFixed(2)}</span>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        `
                            : ""
                        }

                        <div class="section">
                            <h2>Delivery Details</h2>
                            <div class="address-info">
                                <div class="address-label">From</div>
                                <div class="address-value">${truncateText(
                                  data.delivery?.origin || "",
                                )}</div>
                            </div>
                            <div class="address-info">
                                <div class="address-label">To</div>
                                <div class="address-value">${truncateText(
                                  data.delivery?.destination || "",
                                )}</div>
                            </div>
                            <div class="row" style="margin-top: 12px;">
                                <span>Status</span>
                                <span>${data.delivery?.delivery_status?.toUpperCase()}</span>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for using ServiPal</p>
                            <p>This is a computer-generated receipt and does not require a signature.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
  };

  const handleDownload = async () => {
    try {
      const html = generateReceiptHTML();

      // Generate the PDF
      const { uri } = await Print.printToFileAsync({
        html,
        width: screenWidth,
        height: screenWidth * 1.4,
        base64: false,
      });

      const fileName = `Receipt_${data?.order?.order_number || "unknown"}.pdf`;

      // For iOS and Android sharing
      if (await Sharing.isAvailableAsync()) {
        // Direct sharing (recommended)
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: "Share Receipt",
        });

        showSuccess("Success", "Receipt ready to share or save");
      } else {
        // Fallback: Copy to document directory using new File API
        const sourceFile = new File(uri);
        const destinationFile = new File(Paths.document, fileName);

        sourceFile.copy(destinationFile);

        showSuccess("Success", `Receipt saved to ${destinationFile.uri}`);
      }
    } catch (error) {
      console.error("PDF Download Error:", error);
      showError("Error", "Failed to download receipt");
    }
  };
  const handleShare = async () => {
    try {
      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: screenWidth,
        height: screenWidth * 1.4,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Receipt #${data?.order?.order_number}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        showError("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      showError("Error", "Failed to share receipt");
    }
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!data) {
    return null;
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: BG_COLOR,
        alignContent: "center",
      }}
    >
      <View className="gap-4 flex-1 overflow-scroll">
        {/* <Text fontSize={20} fontWeight="bold" textAlign="center">Receipt</Text> */}

        <View className="p-1 bg-background border border-border-subtle px-5 py-3 mt-5 rounded-lg w-[95%] self-center">
          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text className="text-primary">Payment Status</Text>
              <Text
                className={`${data?.order?.order_payment_status === "paid" ? "text-green-700 bg-green-600/20" : "text-red-700 bg-red-600/20"} px-3 py-1 rounded-full`}
              >
                {data?.order?.order_payment_status?.toUpperCase()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-primary font-poppins">Order Number</Text>
              <Text className="text-primary font-poppins-bold">
                #{data?.order?.order_number}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-primary font-poppins">Date</Text>
              <Text className="text-primary">
                {format(new Date(data?.delivery?.created_at || ""), "PPP")}
              </Text>
            </View>

            {data?.order?.order_items &&
              data?.order?.order_type !== "package" &&
              data.order.order_items.length > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-primary font-poppins">Items Total</Text>
                  <Text className="font-poppins text-primary">
                    ₦{Number(data.order?.total_price || 0).toFixed(2)}
                  </Text>
                </View>
              )}

            {data?.delivery?.delivery_fee && (
              <View className="flex-row justify-between">
                <Text className="text-primary font-poppins">Delivery Fee</Text>
                <Text className="font-poppins text-primary">
                  ₦{Number(data.delivery.delivery_fee).toFixed(2)}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between">
              <Text className="text-primary font-poppins-bold">
                Total Amount
              </Text>
              {data?.order?.order_type !== "package" ? (
                <Text className="font-poppins-bold text-primary">
                  ₦
                  {(
                    Number(data.order?.total_price || 0) +
                    Number(data.delivery?.delivery_fee || 0)
                  ).toFixed(2)}
                </Text>
              ) : (
                <Text className="font-poppins-bold text-primary">
                  ₦{data?.delivery?.delivery_fee}
                </Text>
              )}
            </View>
          </View>
        </View>

        {data?.order?.order_items &&
          data?.order?.order_type !== "package" &&
          data.order.order_items.length > 0 && (
            <View className="p-2 bg-input border border-border-subtle px-5 py-3 w-[95%] self-center rounded-lg">
              <View className="gap-1">
                <Text className="text-primary font-poppins-bold">
                  Order Items
                </Text>
                {data.order.order_items.map((item: any) => (
                  <View className="flex-row justify-between" key={item.id}>
                    <Text className="text-primary font-poppins">
                      {item.quantity}X {item.name}
                    </Text>
                    <Text className="text-primary font-poppins-bold">
                      ₦{Number(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        <View className="p-2 bg-input border border-border-subtle self-center rounded-lg w-[95%] px-5 py-3">
          <View className="gap-1">
            <Text className="text-primary font-poppins-bold">
              Delivery Details
            </Text>

            <View className="gap-1">
              <Text className="text-gray-400 font-poppins">From</Text>
              <Text
                className="text-primary font-poppins"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {data?.delivery?.origin}
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-gray-400 font-poppins">To</Text>
              <Text
                className="text-primary font-poppins-light text-sm"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {data?.delivery?.destination}
              </Text>
            </View>

            <View className="justify-between flex-row">
              <Text className="text-gray-400">Status</Text>
              <Text className="text-primary">
                {data?.delivery?.delivery_status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-center mt-6 gap-6 ">
          <TouchableOpacity
            onPress={handleDownload}
            className="bg-gray-700/30 p-5 rounded-full"
          >
            <Feather color={"white"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="bg-orange-700/30 p-5 rounded-full"
          >
            <Feather name="share" color={"orange"} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ReceiptPage;

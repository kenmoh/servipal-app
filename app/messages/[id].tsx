import {
  getDisputeDetails,
  getDisputeMessages,
  markMessagesAsRead,
  sendDisputeMessage,
  subscribeToDisputeMessages,
  uploadDisputeImage,
} from "@/api/dispute";
import { useUserStore } from "@/store/userStore";
import type { DisputeMessage } from "@/types/dispute-types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Format timestamp for message display
 */
const formatMessageTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Message bubble component
 */
const MessageBubble = ({
  message,
  isOwn,
  isOptimistic,
}: {
  message: DisputeMessage;
  isOwn: boolean;
  isOptimistic?: boolean;
}) => {
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <View className={`max-w-[80%] mb-2 ${isOwn ? "self-end" : "self-start"}`}>
      <View
        className={`px-4 py-3 rounded-2xl ${
          isOwn
            ? "bg-brand-primary rounded-br-sm"
            : "bg-surface-elevated rounded-bl-sm"
        } ${isOptimistic ? "opacity-70" : ""}`}
      >
        {/* Attachments */}
        {hasAttachments && (
          <View className="mb-2">
            {message.attachments!.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                className="w-48 h-36 rounded-lg mb-1"
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* Message text */}
        {message.message_text && (
          <Text
            className={`text-sm font-poppins ${
              isOwn ? "text-white" : "text-primary"
            }`}
          >
            {message.message_text}
          </Text>
        )}
      </View>

      <View
        className={`flex-row items-center mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
      >
        <Text className="text-muted text-[10px]">
          {formatMessageTime(message.created_at)}
        </Text>
        {isOwn && (
          <Ionicons
            name={message.is_read ? "checkmark-done" : "checkmark"}
            size={12}
            color={message.is_read ? "#22C55E" : "#9CA3AF"}
            style={{ marginLeft: 4 }}
          />
        )}
        {isOptimistic && (
          <ActivityIndicator
            size={10}
            color="#9CA3AF"
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Header right component showing status badge
 */
const HeaderRight = ({ status }: { status?: string }) => {
  if (!status) return null;

  const isResolved = status === "RESOLVED" || status === "CLOSED";

  return (
    <View
      className={`px-2.5 py-1 rounded-full ${
        isResolved ? "bg-status-success-subtle" : "bg-status-pending-subtle"
      }`}
    >
      <Text
        className={`text-[10px] font-poppins-medium ${
          isResolved ? "text-status-success" : "text-status-pending"
        }`}
      >
        {status}
      </Text>
    </View>
  );
};

/**
 * Message input component with image upload
 */
const MessageInput = ({
  onSend,
  onPickImage,
  selectedImage,
  onRemoveImage,
  disabled,
  isSending,
  isUploading,
}: {
  onSend: (text: string) => void;
  onPickImage: () => void;
  selectedImage: string | null;
  onRemoveImage: () => void;
  disabled?: boolean;
  isSending?: boolean;
  isUploading?: boolean;
}) => {
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || selectedImage) && !isSending && !isUploading) {
      onSend(trimmed);
      setText("");
      Keyboard.dismiss();
    }
  };

  const canSend =
    (text.trim() || selectedImage) && !disabled && !isSending && !isUploading;

  return (
    <View
      className="bg-surface-elevated border-t border-border-subtle px-4 py-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {/* Image preview */}
      {selectedImage && (
        <View className="mb-2">
          <View className="relative self-start">
            <Image
              source={{ uri: selectedImage }}
              className="w-20 h-20 rounded-lg"
              resizeMode="cover"
            />
            <Pressable
              onPress={onRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-status-error rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={14} color="white" />
            </Pressable>
            {isUploading && (
              <View className="absolute inset-0 bg-black/50 rounded-lg items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Unified input container */}
      <View className="flex-row items-center bg-input rounded-full px-2 py-1.5 mx-auto w-full border border-border-subtle">
        {/* Text input */}
        <View className="flex-1 px-4 py-2 min-h-[40px] max-h-[100px]">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            className="text-primary font-poppins text-sm"
            style={{ maxHeight: 80 }}
            editable={!disabled}
          />
        </View>

        {/* Image picker button */}
        <Pressable
          onPress={onPickImage}
          disabled={disabled || isUploading}
          className="w-10 h-10 items-center justify-center ml-1"
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={disabled ? "#9CA3AF" : "#FF8C00"}
          />
        </Pressable>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-full items-center justify-center ml-1 ${
            canSend ? "bg-brand-primary" : "bg-transparent"
          }`}
        >
          {isSending || isUploading ? (
            <ActivityIndicator size="small" color="#FF8C00" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={canSend ? "white" : "#9CA3AF"}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
};

/**
 * Conversation Screen
 */
const ConversationScreen = () => {
  const { id: disputeId } = useLocalSearchParams<{ id: string }>();
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<
    DisputeMessage[]
  >([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch dispute details
  const { data: disputeDetails } = useQuery({
    queryKey: ["dispute-details", disputeId],
    queryFn: () => getDisputeDetails(disputeId!),
    enabled: !!disputeId,
  });

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dispute-messages", disputeId],
    queryFn: () => getDisputeMessages(disputeId!),
    enabled: !!disputeId,
  });

  // Mark messages as read when entering the conversation
  useEffect(() => {
    if (disputeId && messages.length > 0) {
      markMessagesAsRead(disputeId).then(() => {
        // Invalidate disputes list to update unread count
        queryClient.invalidateQueries({ queryKey: ["disputes"] });
      });
    }
  }, [disputeId, messages.length, queryClient]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!disputeId) return;

    const channel = subscribeToDisputeMessages(disputeId, (newMessage) => {
      // Remove from optimistic if it matches
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.message_text !== newMessage.message_text),
      );

      // Add to query cache
      queryClient.setQueryData<DisputeMessage[]>(
        ["dispute-messages", disputeId],
        (old) => {
          if (!old) return [newMessage];
          // Avoid duplicates
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, newMessage];
        },
      );

      // Mark newly received messages as read
      if (newMessage.sender_id !== user?.id) {
        markMessagesAsRead(disputeId);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [disputeId, queryClient, user?.id]);

  // Pick image from gallery
  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  // Send message mutation with optimistic update
  const sendMutation = useMutation({
    mutationFn: sendDisputeMessage,
    onMutate: async (variables) => {
      // Create optimistic message
      const optimisticMsg: DisputeMessage = {
        id: `temp-${Date.now()}`,
        dispute_id: variables.dispute_id,
        sender_id: user?.id || "",
        message_text: variables.message_text,
        attachments: variables.attachments || null,
        created_at: new Date().toISOString(),
        is_read: false,
        read_at: null,
      };

      setOptimisticMessages((prev) => [...prev, optimisticMsg]);
      return { optimisticMsg };
    },
    onError: (error, variables, context) => {
      // Remove optimistic message on error
      if (context?.optimisticMsg) {
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.id !== context.optimisticMsg.id),
        );
      }
    },
    onSuccess: () => {
      // Invalidate disputes list to update last message
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      setSelectedImage(null);
    },
  });

  const handleSend = useCallback(
    async (text: string) => {
      if (!disputeId || !user?.id) return;

      let attachments: string[] | undefined;

      // Upload image if selected
      if (selectedImage) {
        try {
          setIsUploading(true);
          const imageUrl = await uploadDisputeImage(disputeId, selectedImage);
          attachments = [imageUrl];
        } catch (error) {
          console.error("Failed to upload image:", error);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      sendMutation.mutate({
        dispute_id: disputeId,
        message_text: text,
        attachments,
      });
    },
    [disputeId, user?.id, selectedImage, sendMutation],
  );

  // Combine real messages with optimistic ones
  const allMessages = [...messages, ...optimisticMessages];

  const renderMessage = useCallback(
    ({ item }: { item: DisputeMessage }) => {
      const isOwn = item.sender_id === user?.id;
      const isOptimistic = item.id.startsWith("temp-");
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          isOptimistic={isOptimistic}
        />
      );
    },
    [user?.id],
  );

  const keyExtractor = useCallback((item: DisputeMessage) => item.id, []);

  const isResolved =
    disputeDetails?.status === "RESOLVED" ||
    disputeDetails?.status === "CLOSED";

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: "Loading...",
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: "Error",
          }}
        />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-primary font-poppins-semibold text-lg mt-4">
            Failed to load messages
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-brand-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-poppins-medium">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Native Stack Header */}
      <Stack.Screen
        options={{
          title: disputeDetails
            ? `${disputeDetails.order_type} Dispute`
            : "Dispute",
          headerRight: () => <HeaderRight status={disputeDetails?.status} />,
        }}
      />

      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        onLayout={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center">
            <Ionicons name="chatbubble-outline" size={48} color="#9CA3AF" />
            <Text className="text-muted font-poppins-medium mt-4">
              No messages yet
            </Text>
            <Text className="text-muted text-sm mt-1 text-center">
              Start the conversation by sending a message
            </Text>
          </View>
        }
      />

      <MessageInput
        onSend={handleSend}
        onPickImage={handlePickImage}
        selectedImage={selectedImage}
        onRemoveImage={() => setSelectedImage(null)}
        disabled={isResolved}
        isSending={sendMutation.isPending}
        isUploading={isUploading}
      />

      {isResolved && (
        <View className="absolute bottom-20 left-4 right-4 bg-status-success-subtle p-3 rounded-xl">
          <Text className="text-center text-status-success font-poppins-medium text-sm">
            This dispute has been resolved
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default ConversationScreen;

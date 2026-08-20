import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center p-4 bg-background">
          <Text className="text-primary text-lg font-poppins-medium mb-4">
            Something went wrong
          </Text>
          <Text className="text-muted text-sm font-poppins text-center mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg"
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text className="text-white font-poppins-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

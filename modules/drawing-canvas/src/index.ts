import { requireNativeViewManager } from 'expo-modules-core';
import { Platform, type ViewStyle } from 'react-native';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface DrawingCanvasRef {
  clear(): Promise<void>;
  makeImageSnapshot(): Promise<string>;
}

export interface DrawingCanvasProps {
  style?: ViewStyle;
  strokeColor?: string;
}

const NativeDrawingCanvas = Platform.OS === 'ios'
  ? requireNativeViewManager<DrawingCanvasProps & { ref?: any }>('DrawingCanvas')
  : null;

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  function DrawingCanvas({ style, strokeColor }, ref) {
    const nativeRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      clear: () => nativeRef.current.clear(),
      makeImageSnapshot: () => nativeRef.current.makeImageSnapshot(),
    }));

    if (!NativeDrawingCanvas) return null;
    return React.createElement(NativeDrawingCanvas, {
      style,
      strokeColor: strokeColor ?? '#000000',
      ref: nativeRef,
    });
  }
);

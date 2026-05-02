import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export type DrawingImageFields = {
  imageUrl?: string;
  image?: string;
};

export function drawingImageUri(d: DrawingImageFields): string {
  if (d.imageUrl) return d.imageUrl;
  if (d.image) return `data:image/png;base64,${d.image}`;
  return '';
}

export async function shareDrawing(d: DrawingImageFields): Promise<void> {
  const filename = `${FileSystem.cacheDirectory}shared-image.png`;
  if (d.imageUrl) {
    try {
      await FileSystem.downloadAsync(d.imageUrl, filename);
    } catch {
      Alert.alert('Sharing failed', 'Could not download the image to share.');
      return;
    }
  } else if (d.image) {
    const base64 = d.image.replace(/^data:image\/\w+;base64,/, '');
    await FileSystem.writeAsStringAsync(filename, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType: 'image/png',
      dialogTitle: 'Share your drawing!',
    });
  } else {
    Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
  }
}

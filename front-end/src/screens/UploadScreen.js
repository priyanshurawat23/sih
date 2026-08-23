import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadReport } from '../api';

export default function UploadScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processUpload(asset.uri, asset.name, asset.mimeType || 'application/pdf');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        await processUpload(asset.uri, filename, 'image/jpeg');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const processUpload = async (uri, name, type) => {
    setLoading(true);
    try {
      const response = await uploadReport(uri, name, type);
      navigation.navigate('Result', { reportId: response.report_id });
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface style={styles.container}>
      <View style={styles.headerContainer}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          AI Medical Report Simplifier
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Upload your medical reports for a simple, plain-language summary.
        </Text>
      </View>

      <View style={styles.actionContainer}>
        {loading ? (
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <Button
              mode="contained"
              icon="file-pdf-box"
              onPress={handleUploadPDF}
              style={styles.mainButton}
              contentStyle={styles.buttonContent}
            >
              Upload PDF
            </Button>
            <Button
              mode="contained-tonal"
              icon="camera"
              onPress={handleTakePhoto}
              style={styles.mainButton}
              contentStyle={styles.buttonContent}
            >
              Take Photo
            </Button>
          </>
        )}
      </View>

      <Button
        mode="text"
        icon="history"
        onPress={() => navigation.navigate('History')}
        style={styles.historyButton}
      >
        View History
      </Button>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  headerContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mainButton: {
    marginVertical: 10,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  historyButton: {
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
});

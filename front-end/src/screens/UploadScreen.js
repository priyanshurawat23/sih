import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, useTheme, Snackbar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadReport } from '../api';

export default function UploadScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const showError = (msg) => {
    setErrorMessage(msg);
    setErrorVisible(true);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', msg);
    }
  };

  const handleUploadPDF = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,.pdf';
        input.style.display = 'none';

        input.onchange = async (event) => {
          const file = event.target?.files?.[0];
          if (file) {
            await processUpload(file, file.name, file.type || 'application/pdf');
          }
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        input.oncancel = () => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        document.body.appendChild(input);
        input.click();
      } catch (err) {
        showError('Failed to open file picker');
      }
      return;
    }

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
      showError('Failed to pick PDF file');
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.onchange = async (event) => {
          const file = event.target?.files?.[0];
          if (file) {
            await processUpload(file, file.name || 'photo.jpg', file.type || 'image/jpeg');
          }
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        input.oncancel = () => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        document.body.appendChild(input);
        input.click();
      } catch (err) {
        showError('Failed to select image');
      }
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Camera access is required to take photos.');
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
      showError('Failed to take photo');
    }
  };

  const processUpload = async (fileOrUri, name, type) => {
    setLoading(true);
    try {
      const response = await uploadReport(fileOrUri, name, type);
      if (response && response.report_id) {
        navigation.navigate('Result', { reportId: response.report_id });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      showError(error.message || 'An error occurred during upload.');
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
          <View style={styles.loadingWrapper}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} style={styles.loader} />
            <Text style={styles.loadingText}>Uploading and analyzing report...</Text>
          </View>
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

      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => setErrorVisible(false),
        }}
        style={{ backgroundColor: theme.colors.error }}
      >
        <Text style={{ color: '#fff' }}>{errorMessage}</Text>
      </Snackbar>
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
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    opacity: 0.8,
  },
});

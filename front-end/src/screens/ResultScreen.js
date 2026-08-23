import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button, FAB, useTheme, Surface } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { getHistory } from '../api';

export default function ResultScreen({ route, navigation }) {
  const { reportId } = route.params;
  const theme = useTheme();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    let attempt = 0;
    const maxAttempts = 10;
    let timeoutId;

    const pollReport = async () => {
      try {
        const historyData = await getHistory(1);
        const foundReport = historyData.reports.find(r => r.id === reportId);
        
        if (foundReport && foundReport.summary) {
          setReport(foundReport);
          setLoading(false);
        } else {
          attempt++;
          if (attempt >= maxAttempts) {
            setLoading(false);
            setError('Failed to process report summary in time. Please check History later.');
          } else {
            timeoutId = setTimeout(pollReport, 3000);
          }
        }
      } catch (err) {
        setLoading(false);
        setError('Error fetching report data.');
      }
    };

    pollReport();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      Speech.stop();
    };
  }, [reportId]);

  const handleSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      if (report?.summary) {
        setIsSpeaking(true);
        Speech.speak(report.summary, {
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing medical report...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 20 }}>{error}</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Upload')}>Back to Upload</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {report?.has_abnormal && (
          <Surface style={[styles.warningBanner, { backgroundColor: theme.colors.errorContainer || theme.colors.error }]}>
            <Text style={[styles.warningText, { color: theme.colors.onErrorContainer || '#fff' }]}>
              ⚠️ Warning: Some abnormal values were found. Please consult your doctor.
            </Text>
          </Surface>
        )}

        <Card style={styles.card}>
          <Card.Title title="Plain Language Summary" titleStyle={{ color: theme.colors.primary, fontWeight: 'bold' }} />
          <Card.Content>
            <Text variant="bodyMedium" style={{ lineHeight: 24 }}>{report?.summary}</Text>
          </Card.Content>
        </Card>

        {report?.test_values && Object.keys(report.test_values).length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Test Results" titleStyle={{ color: theme.colors.primary, fontWeight: 'bold' }} />
            <Card.Content>
              {Object.entries(report.test_values).map(([testName, testData], index) => {
                const isAbnormal = testData.abnormal;
                return (
                  <View key={index} style={[
                    styles.testRow,
                    isAbnormal ? { backgroundColor: 'rgba(255, 101, 132, 0.2)', borderRadius: 4, padding: 8 } : { padding: 8 }
                  ]}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>{testName}</Text>
                    <Text>{testData.value} {testData.unit}</Text>
                    {isAbnormal && <Text style={{ marginLeft: 8 }}>⚠️</Text>}
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        )}
        
        <Button mode="outlined" onPress={() => navigation.navigate('Upload')} style={styles.backButton}>
          Back to Upload
        </Button>
      </ScrollView>

      <FAB
        icon={isSpeaking ? "volume-off" : "volume-high"}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={handleSpeak}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, opacity: 0.8 },
  warningBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
  warningText: { fontWeight: 'bold', textAlign: 'center' },
  card: { marginBottom: 16, elevation: 2 },
  testRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { marginTop: 10 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

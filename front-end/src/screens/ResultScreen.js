import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button, FAB, useTheme, Surface, Icon, Divider, Chip } from 'react-native-paper';
import { Audio } from 'expo-av';
import { getReport, BASE_URL } from '../api';
import DoctorFinder from '../components/DoctorFinder';

export default function ResultScreen({ route, navigation }) {
  const { reportId } = route.params;
  const theme = useTheme();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sound, setSound] = useState(null);
  const [parsedData, setParsedData] = useState({ summaryText: '', recommendations: [] });

  // Cleanup sound on unmount
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    let attempt = 0;
    const maxAttempts = 30;
    let timeoutId;

    const pollReport = async () => {
      try {
        const foundReport = await getReport(reportId);
        
        if (foundReport && foundReport.summary && foundReport.summary !== 'Processing…') {
          if (foundReport.summary.startsWith('Error:')) {
            setLoading(false);
            setError(foundReport.summary);
          } else {
            // Process the summary parsing
            let summaryText = foundReport.summary;
            let recommendations = [];
            
            try {
              if (foundReport.summary.trim().startsWith('{')) {
                const parsed = JSON.parse(foundReport.summary);
                summaryText = parsed.summary || parsed.overall_summary || parsed.text || foundReport.summary;
                if (Array.isArray(parsed.recommendations)) {
                  recommendations = parsed.recommendations;
                }
              }
            } catch (e) {
              // It's just plain text
            }
            
            setParsedData({ summaryText, recommendations });
            setReport(foundReport);
            setLoading(false);
          }
        } else {
          attempt++;
          if (attempt >= maxAttempts) {
            setLoading(false);
            setError('Report analysis is taking longer than expected. You can check the History tab to view results once ready.');
          } else {
            timeoutId = setTimeout(pollReport, 3000);
          }
        }
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setLoading(false);
          setError(err.message || 'Error fetching report data.');
        } else {
          timeoutId = setTimeout(pollReport, 3000);
        }
      }
    };

    pollReport();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [reportId]);

  const handleSpeak = async () => {
    if (isSpeaking) {
      if (sound) {
        await sound.stopAsync();
      }
      setIsSpeaking(false);
    } else {
      if (parsedData.summaryText) {
        setIsSpeaking(true);
        try {
          const uri = `${BASE_URL}/api/report/${reportId}/audio`;
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
          );
          setSound(newSound);
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsSpeaking(false);
            }
          });
        } catch (err) {
          console.error("Audio playback failed", err);
          setIsSpeaking(false);
        }
      }
    }
  };

  const renderRiskBanner = () => {
    if (!report) return null;
    let riskLevel = report.risk_level?.toUpperCase();
    
    // Fallback logic if risk_level is not provided explicitly
    if (!riskLevel) {
      riskLevel = report.has_abnormal ? 'MODERATE' : 'LOW';
    }

    if (riskLevel === 'HIGH') {
      return (
        <Surface style={[styles.banner, { backgroundColor: theme.colors.danger }]}>
          <Text style={styles.bannerText}>🚨 Urgent: Critical values detected</Text>
        </Surface>
      );
    } else if (riskLevel === 'MODERATE') {
      return (
        <Surface style={[styles.banner, { backgroundColor: theme.colors.warning }]}>
          <Text style={[styles.bannerText, { color: '#000' }]}>⚠️ Some values need attention</Text>
        </Surface>
      );
    } else {
      return (
        <Surface style={[styles.banner, { backgroundColor: theme.colors.success }]}>
          <Text style={styles.bannerText}>✅ All values are within normal range</Text>
        </Surface>
      );
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
        <Icon source="alert-circle" size={48} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.danger, marginTop: 16, marginBottom: 20, textAlign: 'center' }}>{error}</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Upload')}>Back to Upload</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderRiskBanner()}

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon source="file-document-outline" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.primary }]}>Report Summary</Text>
            </View>
            <Divider style={styles.divider} />
            <Text variant="bodyLarge" style={styles.summaryText}>{parsedData.summaryText}</Text>
          </Card.Content>
        </Card>

        {report?.test_values && Object.keys(report.test_values).length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Icon source="test-tube" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.primary }]}>Test Results</Text>
              </View>
              <Divider style={styles.divider} />
              
              {Object.entries(report.test_values).map(([testName, testData], index) => {
                const isAbnormal = testData.abnormal;
                return (
                  <Surface key={index} style={styles.testResultSurface} elevation={1}>
                    <View style={styles.testRow}>
                      <View style={styles.testInfo}>
                        <Text style={styles.testName}>{testName}</Text>
                        {testData.reference_range && (
                          <Text style={styles.referenceText}>Range: {testData.reference_range}</Text>
                        )}
                      </View>
                      <View style={styles.valueContainer}>
                        <Text style={styles.testValue}>{testData.value} {testData.unit}</Text>
                        {isAbnormal ? (
                          <Chip style={{ backgroundColor: theme.colors.danger }} textStyle={{ color: 'white', fontSize: 12 }}>Abnormal</Chip>
                        ) : (
                          <Chip style={{ backgroundColor: theme.colors.success }} textStyle={{ color: 'white', fontSize: 12 }}>Normal</Chip>
                        )}
                      </View>
                    </View>
                  </Surface>
                );
              })}
            </Card.Content>
          </Card>
        )}

        <DoctorFinder doctorAdvice={report?.doctor_advice} />

        {parsedData.recommendations && parsedData.recommendations.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Icon source="heart-plus-outline" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.primary }]}>Health Recommendations</Text>
              </View>
              <Divider style={styles.divider} />
              {parsedData.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Icon source="circle-small" size={24} color={theme.colors.primary} />
                  <Text style={styles.bulletText}>{rec}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <Text style={styles.disclaimer}>
          Disclaimer: This AI-generated summary is for informational purposes only and does not replace professional medical advice. Always consult a healthcare provider for a proper diagnosis.
        </Text>

        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.navigate('Upload')} style={styles.backButton}>
          Back to Upload
        </Button>
      </ScrollView>

      <FAB
        icon={isSpeaking ? "stop" : "volume-high"}
        label={isSpeaking ? "Stop Audio" : "Text-to-Speech"}
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
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  banner: { padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  bannerText: { fontWeight: 'bold', textAlign: 'center', fontSize: 16, color: '#fff' },
  card: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontWeight: 'bold', marginLeft: 8 },
  divider: { marginBottom: 12 },
  summaryText: { lineHeight: 26, fontSize: 16 },
  testResultSurface: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testInfo: { flex: 1, paddingRight: 10 },
  testName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  referenceText: { fontSize: 12, opacity: 0.6 },
  valueContainer: { alignItems: 'flex-end', gap: 6 },
  testValue: { fontWeight: 'bold', fontSize: 16 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 16 },
  bulletText: { fontSize: 15, lineHeight: 22, flex: 1, marginTop: 2 },
  disclaimer: { fontSize: 12, opacity: 0.6, textAlign: 'center', marginVertical: 16, paddingHorizontal: 16 },
  backButton: { marginTop: 8, borderRadius: 8, paddingVertical: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme, Surface, Chip, Icon } from 'react-native-paper';
import { getHistory } from '../api';

const formatDisplayDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0 && now.getDate() === date.getDate()) {
    return 'Today';
  } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== date.getDate())) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

export default function HistoryScreen({ navigation }) {
  const theme = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    try {
      const data = await getHistory(1);
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);

  const getTrendData = () => {
    const trends = {};
    const sortedReports = [...reports].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    sortedReports.forEach(r => {
      if (r.test_values) {
        Object.keys(r.test_values).forEach(testName => {
          const val = r.test_values[testName].value;
          if (val !== undefined && val !== null) {
            if (!trends[testName]) trends[testName] = [];
            trends[testName].push(val);
          }
        });
      }
    });

    return Object.keys(trends)
      .filter(t => trends[t].length > 1)
      .map(t => ({ name: t, values: trends[t] }));
  };

  const renderTrendSection = () => {
    const trends = getTrendData();
    if (trends.length === 0) return null;

    return (
      <Surface style={[styles.trendContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.trendHeader}>
          <Icon source="chart-line" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: 'bold' }}>
            Test Value Trends
          </Text>
        </View>
        {trends.map((t, idx) => (
          <View key={idx} style={styles.trendRow}>
            <Text style={{ fontWeight: 'bold', width: 100 }} numberOfLines={1}>{t.name}</Text>
            <Text style={{ flex: 1, opacity: 0.8 }} numberOfLines={1}>{t.values.join(' → ')}</Text>
          </View>
        ))}
      </Surface>
    );
  };

  const renderItem = ({ item }) => {
    const dateStr = formatDisplayDate(item.created_at);
    
    let summaryText = item.summary || 'Processing...';
    try {
      if (summaryText.trim().startsWith('{')) {
        const parsed = JSON.parse(summaryText);
        summaryText = parsed.summary || parsed.overall_summary || parsed.text || 'View details for full summary.';
      }
    } catch(e) {}
    
    const preview = summaryText.length > 80 ? summaryText.substring(0, 80) + '...' : summaryText;

    let riskLevel = item.risk_level?.toUpperCase();
    if (!riskLevel) {
      riskLevel = item.has_abnormal ? 'MODERATE' : 'LOW';
    }

    let borderColor = theme.colors.success;
    if (riskLevel === 'HIGH') borderColor = theme.colors.danger;
    else if (riskLevel === 'MODERATE') borderColor = theme.colors.warning;

    return (
      <Card 
        style={[styles.card, { borderLeftWidth: 6, borderLeftColor: borderColor }]} 
        onPress={() => navigation.navigate('Result', { reportId: item.id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>{dateStr}</Text>
            {item.language && item.language !== 'en' && (
              <Chip textStyle={{ fontSize: 10, paddingVertical: 0 }} style={{ height: 24, alignSelf: 'center' }}>
                {item.language.toUpperCase()}
              </Chip>
            )}
          </View>
          
          <Text variant="bodyMedium" style={styles.previewText}>{preview}</Text>
          
          {item.doctor_advice && item.doctor_advice.specialist_type && (
            <View style={styles.adviceContainer}>
              <Icon source="stethoscope" size={16} color={theme.colors.primary} />
              <Text style={styles.adviceText}>
                Recommended: {item.doctor_advice.specialist_type}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !refreshing && reports.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Icon source="alert-circle" size={48} color={theme.colors.error} />
        <Text style={{ color: theme.colors.error, marginTop: 16, marginBottom: 16 }}>{error}</Text>
        <Button mode="contained" onPress={onRefresh}>Retry</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={[...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderTrendSection}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="file-document-outline" size={64} color={theme.colors.primary} />
            <Text style={{ textAlign: 'center', marginTop: 16, opacity: 0.6, fontSize: 16 }}>No reports found.</Text>
            <Button mode="outlined" style={{ marginTop: 24 }} onPress={() => navigation.navigate('Upload')}>
              Upload a Report
            </Button>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { padding: 16, paddingBottom: 40 },
  trendContainer: { padding: 16, borderRadius: 12, marginBottom: 16 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trendRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  card: { marginBottom: 16, borderRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateText: { fontWeight: 'bold', fontSize: 16 },
  previewText: { opacity: 0.8, lineHeight: 20, marginBottom: 12 },
  adviceContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    padding: 8,
    borderRadius: 6
  },
  adviceText: { fontSize: 13, marginLeft: 6, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
});

import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme, Surface, Badge } from 'react-native-paper';
import { getHistory } from '../api';

export default function HistoryScreen({ navigation }) {
  const theme = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory(1);
        setReports(data.reports || []);
      } catch (error) {
        Alert.alert('Error', 'Failed to load history.');
      } finally {
        setLoading(false);
      }
    };
    
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
      <Surface style={[styles.trendContainer, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, marginBottom: 8, fontWeight: 'bold' }}>
          Test Value Trends
        </Text>
        {trends.map((t, idx) => (
          <Text key={idx} style={{ marginBottom: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>{t.name}:</Text> {t.values.join(' → ')}
          </Text>
        ))}
      </Surface>
    );
  };

  const renderItem = ({ item }) => {
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date';
    const preview = item.summary ? (item.summary.length > 100 ? item.summary.substring(0, 100) + '...' : item.summary) : 'Processing...';

    return (
      <Card style={styles.card} onPress={() => navigation.navigate('Result', { reportId: item.id })}>
        <Card.Title 
          title={`Report on ${dateStr}`} 
          titleStyle={{ color: theme.colors.primary }}
          right={(props) => item.has_abnormal ? <Badge size={24} style={{ marginRight: 16, backgroundColor: theme.colors.error }}>!</Badge> : null}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={{ opacity: 0.8 }}>{preview}</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={[...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderTrendSection}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, opacity: 0.6 }}>No reports found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  trendContainer: { padding: 16, borderRadius: 8, marginBottom: 16, elevation: 2 },
  card: { marginBottom: 12, elevation: 2 },
});

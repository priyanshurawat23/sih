import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Card, Text, Button, Icon, Surface, useTheme, Chip } from 'react-native-paper';
import { doctorInfo } from '../data/doctorInfo';

const DoctorFinder = ({ doctorAdvice }) => {
  const theme = useTheme();

  if (!doctorAdvice) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.noAdvice}>
          <Icon source="check-circle" size={40} color={theme.colors.success} />
          <Text style={[styles.title, { marginTop: 10 }]}>No specialist consultation needed at this time.</Text>
        </Card.Content>
      </Card>
    );
  }

  const { specialist_type, reason, urgency, description: adviceDescription } = doctorAdvice;
  const specialistDetails = doctorInfo[specialist_type] || {
    description: "Specialist consultation recommended.",
    treats: [],
    icon: "stethoscope",
    whenToVisit: "As recommended by your report.",
    urgencyNote: ""
  };

  const getUrgencyColor = () => {
    switch(urgency?.toUpperCase()) {
      case 'ROUTINE': return theme.colors.success;
      case 'SOON': return theme.colors.warning;
      case 'URGENT': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  };

  const handleFindDoctor = () => {
    const query = `${specialist_type} doctor near me`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url);
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Icon source="stethoscope" size={24} color={theme.colors.primary} />
          <Text style={styles.title}>Doctor Recommendation</Text>
        </View>
        
        <Surface style={styles.specialistBox} elevation={1}>
          <View style={styles.specialistHeader}>
            <View style={styles.iconContainer}>
              <Icon source={specialistDetails.icon} size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.specialistTextContainer}>
              <Text style={styles.specialistName}>{specialist_type}</Text>
              <Chip textStyle={{ color: 'white' }} style={{ backgroundColor: getUrgencyColor(), marginTop: 4 }}>
                {urgency || 'RECOMMENDED'}
              </Chip>
            </View>
          </View>
          
          <Text style={styles.description}>{specialistDetails.description}</Text>
          
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Why you need them:</Text>
            <Text style={styles.reasonText}>{reason || adviceDescription}</Text>
          </View>
        </Surface>

        <Button 
          mode="contained" 
          icon="map-marker" 
          onPress={handleFindDoctor}
          style={styles.findButton}
          buttonColor={theme.colors.primary}
        >
          Find Nearby {specialist_type}
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  specialistBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  specialistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specialistTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  specialistName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  reasonContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6C63FF',
  },
  reasonLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
  },
  findButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  noAdvice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  }
});

export default DoctorFinder;

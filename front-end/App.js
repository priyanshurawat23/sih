import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/theme';

import UploadScreen from './src/screens/UploadScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator 
          initialRouteName="Upload" 
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            contentStyle: { backgroundColor: theme.colors.background }
          }}
        >
          <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'AI Medical Report' }} />
          <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Summary' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

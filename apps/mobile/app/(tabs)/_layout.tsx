import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, on: IoniconsName, off: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={focused ? on : off} size={size} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6abf69' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'search', 'search-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'layers', 'layers-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'albums', 'albums-outline')({ color, size }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) =>
            icon(focused, 'settings', 'settings-outline')({ color, size }),
        }}
      />
    </Tabs>
  );
}

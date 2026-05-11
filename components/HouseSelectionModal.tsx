import { View, Text, StyleSheet, Modal, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Hop as HouseIcon, Check } from 'lucide-react-native';

type House = {
  id: string;
  name: string;
  house_emoji?: string;
};

type HouseSelectionModalProps = {
  visible: boolean;
  houses: House[];
  selectedHouseId: string | null;
  onSelectHouse: (houseId: string) => void;
  onClose: () => void;
  loading?: boolean;
};

export default function HouseSelectionModal({
  visible,
  houses,
  selectedHouseId,
  onSelectHouse,
  onClose,
  loading = false,
}: HouseSelectionModalProps) {
  const renderHouse = ({ item }: { item: House }) => {
    const isSelected = selectedHouseId === item.id;

    return (
      <Pressable
        style={[styles.houseItem, isSelected && styles.houseItemSelected]}
        onPress={() => onSelectHouse(item.id)}
      >
        <View style={styles.houseContent}>
          {item.house_emoji && (
            <Text style={styles.houseEmoji}>{item.house_emoji}</Text>
          )}
          <Text style={[styles.houseName, isSelected && styles.houseNameSelected]}>
            {item.name}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <Check size={20} color="#10B981" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select House</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#94A3B8" />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Choose which house you want to upload this image to
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : houses.length === 0 ? (
            <View style={styles.emptyState}>
              <HouseIcon size={48} color="#475569" />
              <Text style={styles.emptyText}>No houses available</Text>
            </View>
          ) : (
            <FlatList
              data={houses}
              renderItem={renderHouse}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
            />
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
  listContent: {
    gap: 12,
  },
  houseItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#334155',
  },
  houseItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#065F46',
  },
  houseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  houseEmoji: {
    fontSize: 24,
  },
  houseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  houseNameSelected: {
    color: '#10B981',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
});

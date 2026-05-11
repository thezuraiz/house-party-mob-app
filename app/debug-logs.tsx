import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react-native';

type AppLog = {
  id: string;
  created_at: string;
  level: string;
  message: string;
  event_type: string;
  event_name: string;
  status: string;
  metadata: any;
  screen_name: string;
  platform: string;
};

export default function DebugLogsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('app_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log('[DEBUG_LOGS] Error fetching logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.log('[DEBUG_LOGS] Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      const { error } = await supabase
        .from('app_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.log('[DEBUG_LOGS] Error clearing logs:', error);
        alert('Failed to clear logs: ' + error.message);
        return;
      }

      setLogs([]);
      alert('Logs cleared');
    } catch (err) {
      console.log('[DEBUG_LOGS] Exception clearing logs:', err);
      alert('Failed to clear logs');
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#EF4444';
      case 'warn':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      case 'debug':
        return '#8B5CF6';
      default:
        return '#94A3B8';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const filterAuthLogs = logs.filter(log =>
    log.message.includes('CONFIRM_EMAIL') ||
    log.message.includes('AUTH_REDIRECT') ||
    log.event_type === 'AUTH'
  );

  const displayLogs = filterAuthLogs.length > 0 ? filterAuthLogs : logs;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Debug Logs</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={[styles.refreshButton, autoRefresh && styles.refreshButtonActive]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.clearButton}
            onPress={clearLogs}
          >
            <Trash2 size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          {autoRefresh ? '🟢 Auto-refreshing every 2s' : '⏸️ Auto-refresh paused'}
        </Text>
        <Text style={styles.infoText}>
          {displayLogs.length} logs{filterAuthLogs.length > 0 ? ' (Auth filtered)' : ''}
        </Text>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : displayLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No logs yet</Text>
          <Text style={styles.emptySubtext}>
            Logs will appear here as you use the app
          </Text>
          <Pressable style={styles.manualRefresh} onPress={fetchLogs}>
            <RefreshCw size={20} color="#10B981" />
            <Text style={styles.manualRefreshText}>Refresh Now</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {displayLogs.map((log, index) => (
            <View key={log.id || index} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(log.level) }]}>
                  <Text style={styles.levelText}>{log.level?.toUpperCase()}</Text>
                </View>
                <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
              </View>

              <Text style={styles.logMessage}>{log.message}</Text>

              {log.event_type && (
                <Text style={styles.logDetail}>
                  Event: {log.event_type} / {log.event_name}
                </Text>
              )}

              {log.screen_name && (
                <Text style={styles.logDetail}>Screen: {log.screen_name}</Text>
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <Text style={styles.logMetadata}>
                  {JSON.stringify(log.metadata, null, 2)}
                </Text>
              )}
            </View>
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonActive: {
    backgroundColor: '#10B981',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  manualRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  manualRefreshText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  logMessage: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 6,
    lineHeight: 20,
  },
  logDetail: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  logMetadata: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    fontFamily: 'monospace',
  },
  bottomPadding: {
    height: 40,
  },
});


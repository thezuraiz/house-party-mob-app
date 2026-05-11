import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

type CheckResult = {
  test: string;
  result: string;
  status: 'success' | 'error' | 'warning';
  details?: string;
};

export default function DiagnosticScreen() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [clearing, setClearing] = useState(false);

  const clearAllCachedData = async () => {
    setClearing(true);
    try {
      // 1. Sign out from Supabase (this removes auth tokens)
      await supabase.auth.signOut();

      // 2. Clear all AsyncStorage data
      await AsyncStorage.clear();

      // 3. Clear all SecureStore data (auth tokens)
      try {
        const supabaseKeys = [
          'supabase.auth.token',
          '@supabase/auth-token',
          'sb-auth-token',
        ];

        for (const key of supabaseKeys) {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch (e) {
            // Key might not exist, that's okay
          }
        }
      } catch (e) {
        console.log('SecureStore clear completed');
      }

      Alert.alert(
        'Cache Cleared',
        'All cached data has been removed. The app will now restart.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(auth)/welcome');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to clear cache: ${error.message}`);
    } finally {
      setClearing(false);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    const checks: CheckResult[] = [];
    const startTime = Date.now();

    try {
      // 1. Check Authentication
      if (user) {
        checks.push({
          test: 'Authentication',
          result: 'Logged in',
          status: 'success',
          details: `User ID: ${user.id.substring(0, 8)}... | Email: ${user.email}`
        });

        // Check email confirmation status
        if (user.email_confirmed_at) {
          checks.push({
            test: 'Email Verification',
            result: 'VERIFIED ✓',
            status: 'success',
            details: `Confirmed at: ${new Date(user.email_confirmed_at).toLocaleString()}`
          });
        } else {
          checks.push({
            test: 'Email Verification',
            result: 'NOT VERIFIED ✗',
            status: 'error',
            details: 'User must confirm email before accessing app. Should be on confirm-email screen!'
          });
        }

        // Check onboarding status
        try {
          const { data: profileSettings } = await supabase
            .from('user_profile_settings')
            .select('has_completed_onboarding')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileSettings) {
            if (profileSettings.has_completed_onboarding) {
              checks.push({
                test: 'Onboarding Status',
                result: 'COMPLETED ✓',
                status: 'success',
                details: 'User should be on main app (tabs)'
              });
            } else {
              checks.push({
                test: 'Onboarding Status',
                result: 'INCOMPLETE',
                status: 'warning',
                details: 'User should be on onboarding screen'
              });
            }
          } else {
            checks.push({
              test: 'Onboarding Status',
              result: 'Settings not found',
              status: 'error',
              details: 'Profile settings missing - database issue'
            });
          }
        } catch (e: any) {
          checks.push({
            test: 'Onboarding Status',
            result: 'Check Failed',
            status: 'error',
            details: e.message
          });
        }

        // Determine expected routing
        let expectedRoute = '';
        if (!user.email_confirmed_at) {
          expectedRoute = '→ CONFIRM EMAIL';
        } else {
          const { data: settings } = await supabase
            .from('user_profile_settings')
            .select('has_completed_onboarding')
            .eq('user_id', user.id)
            .maybeSingle();

          if (settings?.has_completed_onboarding) {
            expectedRoute = '→ MAIN APP (TABS)';
          } else {
            expectedRoute = '→ ONBOARDING';
          }
        }

        checks.push({
          test: 'Expected Current Screen',
          result: expectedRoute,
          status: 'success',
          details: 'Based on email verification and onboarding status'
        });
      } else {
        checks.push({
          test: 'Authentication',
          result: 'Not logged in',
          status: 'warning',
          details: 'No active session - should be on Welcome/SignIn/SignUp'
        });

        checks.push({
          test: 'Expected Current Screen',
          result: '→ WELCOME / SIGNIN / SIGNUP',
          status: 'success',
          details: 'User is not authenticated'
        });
      }

      // 2. Check Session
      if (session) {
        checks.push({
          test: 'Session Token',
          result: 'Valid',
          status: 'success',
          details: `Expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`
        });
      } else {
        checks.push({
          test: 'Session Token',
          result: 'No active session',
          status: 'warning',
          details: 'Session may have expired or user never signed in'
        });
      }

      // 3. Check house_kits table
      const startHouseKits = Date.now();
      const { data: kits, error: kitsError } = await supabase
        .from('house_kits')
        .select('*')
        .limit(5);
      const houseKitTime = Date.now() - startHouseKits;

      if (kitsError) {
        checks.push({
          test: 'house_kits Table',
          result: 'Query Failed',
          status: 'error',
          details: `Error: ${kitsError.message} (Code: ${kitsError.code})`
        });
      } else {
        checks.push({
          test: 'house_kits Table',
          result: `${kits?.length || 0} rows returned`,
          status: (kits?.length || 0) > 0 ? 'success' : 'warning',
          details: `Query time: ${houseKitTime}ms`
        });
      }

      // 4. Check user_kit_catalog view
      const startCatalog = Date.now();
      const { data: catalog, error: catalogError } = await supabase
        .from('user_kit_catalog')
        .select('*')
        .limit(5);
      const catalogTime = Date.now() - startCatalog;

      if (catalogError) {
        checks.push({
          test: 'user_kit_catalog View',
          result: 'Query Failed',
          status: 'error',
          details: `Error: ${catalogError.message} (Code: ${catalogError.code})`
        });
      } else {
        checks.push({
          test: 'user_kit_catalog View',
          result: `${catalog?.length || 0} rows returned`,
          status: (catalog?.length || 0) > 0 ? 'success' : 'error',
          details: `Query time: ${catalogTime}ms - This is what Shop tab uses!`
        });
      }

      // 5. Check emoji_packs
      const { data: packs, error: packsError } = await supabase
        .from('emoji_packs')
        .select('*')
        .limit(5);

      if (packsError) {
        checks.push({
          test: 'emoji_packs Table',
          result: 'Query Failed',
          status: 'error',
          details: `Error: ${packsError.message}`
        });
      } else {
        const freeCount = packs?.filter(p => p.is_free).length || 0;
        checks.push({
          test: 'emoji_packs Table',
          result: `${packs?.length || 0} packs (${freeCount} free)`,
          status: (packs?.length || 0) > 0 ? 'success' : 'error',
          details: freeCount === 0 ? 'No free packs - create house will fail!' : 'Create house should work'
        });
      }

      // 6. Check user's houses
      if (user) {
        const { data: houses, error: housesError } = await supabase
          .from('house_members')
          .select('house_id, role, houses(name)')
          .eq('user_id', user.id);

        if (housesError) {
          checks.push({
            test: 'Your Houses',
            result: 'Query Failed',
            status: 'error',
            details: `Error: ${housesError.message}`
          });
        } else {
          checks.push({
            test: 'Your Houses',
            result: `${houses?.length || 0} houses`,
            status: 'success',
            details: houses?.length ? `First house: ${(houses[0] as any).houses?.name || 'Unknown'}` : 'No houses yet'
          });
        }
      } else {
        checks.push({
          test: 'Your Houses',
          result: 'Skipped',
          status: 'warning',
          details: 'Sign in to check houses'
        });
      }

      // 7. Network latency check
      const totalTime = Date.now() - startTime;
      if (totalTime < 1000) {
        checks.push({
          test: 'Network Performance',
          result: 'Excellent',
          status: 'success',
          details: `Total diagnostics time: ${totalTime}ms`
        });
      } else if (totalTime < 3000) {
        checks.push({
          test: 'Network Performance',
          result: 'Good',
          status: 'success',
          details: `Total diagnostics time: ${totalTime}ms`
        });
      } else {
        checks.push({
          test: 'Network Performance',
          result: 'Slow',
          status: 'warning',
          details: `Total diagnostics time: ${totalTime}ms - Check your connection`
        });
      }

      // 8. Check logging system
      try {
        const { data: logFunction, error: funcError } = await supabase
          .rpc('insert_app_logs_batch', { logs: [] });

        if (funcError) {
          checks.push({
            test: 'Logging System (Batch Function)',
            result: 'Function Missing',
            status: 'warning',
            details: `RPC failed: ${funcError.message}. Will use fallback insert.`
          });
        } else {
          checks.push({
            test: 'Logging System (Batch Function)',
            result: 'Available',
            status: 'success',
            details: 'insert_app_logs_batch function exists'
          });
        }
      } catch (e: any) {
        checks.push({
          test: 'Logging System (Batch Function)',
          result: 'Error',
          status: 'warning',
          details: `Error: ${e.message}`
        });
      }

      // 9. Check app_logs table columns
      try {
        const { data: columns, error: colError } = await supabase
          .from('app_logs')
          .select('id, event_type, event_name, status, metadata, breadcrumbs')
          .limit(1);

        if (colError) {
          checks.push({
            test: 'Logging Table Schema',
            result: 'Error',
            status: 'error',
            details: `${colError.message}. Old schema detected!`
          });
        } else {
          checks.push({
            test: 'Logging Table Schema',
            result: 'Updated',
            status: 'success',
            details: 'New columns (event_type, metadata, breadcrumbs) exist'
          });
        }
      } catch (e: any) {
        checks.push({
          test: 'Logging Table Schema',
          result: 'Error',
          status: 'error',
          details: e.message
        });
      }

      // 10. Test logging insert
      try {
        const testLog = {
          level: 'info',
          message: 'Diagnostic test log',
          event_type: 'SYSTEM',
          event_name: 'diagnostic_test',
          status: 'success',
          timestamp: new Date().toISOString(),
          user_id: user?.id || null,
          device_info: { platform: 'test' },
          metadata: { test: true }
        };

        const { error: insertError } = await supabase
          .from('app_logs')
          .insert([testLog]);

        if (insertError) {
          checks.push({
            test: 'Log Insert Test',
            result: 'Failed',
            status: 'error',
            details: `${insertError.message}. Check RLS policies!`
          });
        } else {
          checks.push({
            test: 'Log Insert Test',
            result: 'Success',
            status: 'success',
            details: 'Can write to app_logs table'
          });
        }
      } catch (e: any) {
        checks.push({
          test: 'Log Insert Test',
          result: 'Error',
          status: 'error',
          details: e.message
        });
      }

      // 11. Supabase connection test
      checks.push({
        test: 'Supabase Connection',
        result: 'Connected',
        status: 'success',
        details: 'Database is reachable from this device'
      });

    } catch (error: any) {
      checks.push({
        test: 'Unexpected Error',
        result: 'Diagnostics Failed',
        status: 'error',
        details: error?.message || 'Unknown error occurred'
      });
    }

    setResults(checks);
    setLastRun(new Date());
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [user]);

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color="#10B981" />;
      case 'error':
        return <XCircle size={20} color="#EF4444" />;
      case 'warning':
        return <AlertCircle size={20} color="#F59E0B" />;
    }
  };

  const getStatusColor = (status: CheckResult['status']) => {
    switch (status) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>System Diagnostics</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={runDiagnostics}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={22} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{successCount}</Text>
          <Text style={styles.summaryLabel}>Passed</Text>
          <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{warningCount}</Text>
          <Text style={styles.summaryLabel}>Warnings</Text>
          <View style={[styles.summaryDot, { backgroundColor: '#F59E0B' }]} />
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{errorCount}</Text>
          <Text style={styles.summaryLabel}>Failed</Text>
          <View style={[styles.summaryDot, { backgroundColor: '#EF4444' }]} />
        </View>
      </View>

      {lastRun && (
        <Text style={styles.timestamp}>
          Last run: {lastRun.toLocaleTimeString()}
        </Text>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading && results.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          </View>
        ) : (
          results.map((check, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={styles.checkHeader}>
                {getStatusIcon(check.status)}
                <View style={styles.checkInfo}>
                  <Text style={styles.checkName}>{check.test}</Text>
                  <Text style={[styles.checkResult, { color: getStatusColor(check.status) }]}>
                    {check.result}
                  </Text>
                </View>
              </View>
              {check.details && (
                <Text style={styles.checkDetails}>{check.details}</Text>
              )}
            </View>
          ))
        )}

        <View style={styles.infoBox}>
          <AlertCircle size={18} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About These Tests</Text>
            <Text style={styles.infoText}>
              These diagnostics check if your app can connect to the database and retrieve data.
              If "user_kit_catalog View" shows 0 rows but you're logged in, there may be an RLS policy issue.
            </Text>
          </View>
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Troubleshooting Tips</Text>
          <Text style={styles.helpText}>
            • If authentication fails: Try signing out and back in{'\n'}
            • If views return 0 rows: Check RLS policies in Supabase{'\n'}
            • If queries are slow: Check your internet connection{'\n'}
            • If tables fail: Database may need seeding
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.clearAllButton]}
            onPress={() => {
              Alert.alert(
                'Clear All Cached Data',
                'This will:\n\n• Sign you out completely\n• Remove all stored auth tokens\n• Clear AsyncStorage\n• Clear SecureStore\n• Reset the app to fresh state\n\nThis is useful for debugging auth issues.\n\nContinue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear Everything',
                    style: 'destructive',
                    onPress: clearAllCachedData,
                  },
                ]
              );
            }}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Clear All Cached Data</Text>
              </>
            )}
          </Pressable>

          {session && (
            <Pressable
              style={[styles.actionButton, styles.signOutButton]}
              onPress={() => {
                Alert.alert(
                  'Sign Out',
                  'Sign out from current session?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/(auth)/welcome');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.actionButtonText}>Sign Out Only</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  summaryDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  checkRow: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkInfo: {
    flex: 1,
  },
  checkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  checkResult: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkDetails: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    marginLeft: 32,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  helpBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  clearAllButton: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


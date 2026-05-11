import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import CoachMarkOverlay from '@/components/CoachMarkOverlay';
import {
  CoachMarkFlow,
  CoachMarkStep,
  TargetElement,
  UserOnboardingProgress,
  CoachMarkContextValue,
} from '@/types/coachMark';
import { COACH_MARK_FLOWS } from '@/constants/CoachMarkFlows';

const CoachMarkContext = createContext<CoachMarkContextValue | undefined>(undefined);

export function CoachMarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentFlow, setCurrentFlow] = useState<CoachMarkFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetElements, setTargetElements] = useState<Map<string, TargetElement>>(new Map());
  const [userProgress, setUserProgress] = useState<UserOnboardingProgress | null>(null);
  const [flowQueue, setFlowQueue] = useState<string[]>([]);
  const lastInteractionTime = useRef<number>(0);
  const COOLDOWN_MS = 30000;

  useEffect(() => {
    if (user) {
      loadUserProgress();
    }
  }, [user]);

  const loadUserProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.log('Error loading onboarding progress:', error);
        return;
      }

      if (data) {
        setUserProgress({
          id: data.id,
          userId: data.user_id,
          completedSteps: data.completed_steps || [],
          currentFlowName: data.current_flow_name,
          currentStepIndex: data.current_step_index || 0,
          isOnboardingComplete: data.is_onboarding_complete || false,
          lastInteractionAt: data.last_interaction_at,
          skippedFlows: data.skipped_flows || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        const { data: newProgress, error: insertError } = await supabase
          .from('user_onboarding_progress')
          .insert({
            user_id: user.id,
            completed_steps: [],
            skipped_flows: [],
            is_onboarding_complete: false,
          })
          .select()
          .single();

        if (!insertError && newProgress) {
          setUserProgress({
            id: newProgress.id,
            userId: newProgress.user_id,
            completedSteps: [],
            currentFlowName: null,
            currentStepIndex: 0,
            isOnboardingComplete: false,
            lastInteractionAt: newProgress.last_interaction_at,
            skippedFlows: [],
            createdAt: newProgress.created_at,
            updatedAt: newProgress.updated_at,
          });
        }
      }
    } catch (error) {
      console.log('Error in loadUserProgress:', error);
    }
  };

  const registerTarget = useCallback((targetId: string, element: TargetElement) => {
    setTargetElements((prev) => {
      const newMap = new Map(prev);
      newMap.set(targetId, element);
      return newMap;
    });
  }, []);

  const unregisterTarget = useCallback((targetId: string) => {
    setTargetElements((prev) => {
      const newMap = new Map(prev);
      newMap.delete(targetId);
      return newMap;
    });
  }, []);

  const startFlow = useCallback(
    async (flowName: string) => {
      if (!user || isActive) return;

      const now = Date.now();
      if (now - lastInteractionTime.current < COOLDOWN_MS) {
        console.log('Coach mark cooldown active, queueing flow');
        setFlowQueue((prev) => [...prev, flowName]);
        return;
      }

      if (userProgress?.skippedFlows.includes(flowName)) {
        console.log('Flow was previously skipped');
        return;
      }

      const flow = COACH_MARK_FLOWS.find((f) => f.flowName === flowName);
      if (!flow) {
        console.log('Flow not found:', flowName);
        return;
      }

      const allStepsCompleted = flow.steps.every((step) =>
        userProgress?.completedSteps.includes(step.stepId)
      );

      if (allStepsCompleted) {
        console.log('All steps already completed for this flow');
        return;
      }

      const firstIncompleteIndex = flow.steps.findIndex(
        (step) => !userProgress?.completedSteps.includes(step.stepId)
      );

      setCurrentFlow(flow);
      setCurrentStepIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
      setIsActive(true);
      lastInteractionTime.current = now;

      try {
        await supabase
          .from('user_onboarding_progress')
          .update({
            current_flow_name: flowName,
            current_step_index: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0,
            last_interaction_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.log('Error updating flow state:', error);
      }
    },
    [user, isActive, userProgress]
  );

  const nextStep = useCallback(async () => {
    if (!currentFlow || !user) return;

    const currentStep = currentFlow.steps[currentStepIndex];
    if (currentStep) {
      await completeStep(currentStep.stepId);
    }

    if (currentStepIndex < currentFlow.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);

      try {
        await supabase
          .from('user_onboarding_progress')
          .update({
            current_step_index: nextIndex,
            last_interaction_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.log('Error updating step index:', error);
      }
    } else {
      setIsActive(false);
      setCurrentFlow(null);
      setCurrentStepIndex(0);

      try {
        await supabase
          .from('user_onboarding_progress')
          .update({
            current_flow_name: null,
            current_step_index: 0,
            last_interaction_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.log('Error clearing flow state:', error);
      }

      if (flowQueue.length > 0) {
        const nextFlowName = flowQueue[0];
        setFlowQueue((prev) => prev.slice(1));
        setTimeout(() => startFlow(nextFlowName), 2000);
      }
    }
  }, [currentFlow, currentStepIndex, user, flowQueue]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const skipFlow = useCallback(async () => {
    if (!user || !currentFlow) return;

    try {
      await supabase.rpc('skip_onboarding_flow', {
        p_user_id: user.id,
        p_flow_name: currentFlow.flowName,
      });

      setUserProgress((prev) =>
        prev
          ? {
              ...prev,
              skippedFlows: [...prev.skippedFlows, currentFlow.flowName],
            }
          : null
      );
    } catch (error) {
      console.log('Error skipping flow:', error);
    }

    setIsActive(false);
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  }, [user, currentFlow]);

  const completeStep = useCallback(
    async (stepId: string) => {
      if (!user) return;

      try {
        const result = await supabase.rpc('mark_onboarding_step_complete', {
          p_user_id: user.id,
          p_step_id: stepId,
          p_flow_name: currentFlow?.flowName,
        });

        if (result.data) {
          setUserProgress((prev) =>
            prev
              ? {
                  ...prev,
                  completedSteps: result.data.completed_steps || prev.completedSteps,
                }
              : null
          );
        }
      } catch (error) {
        console.log('Error completing step:', error);
      }
    },
    [user, currentFlow]
  );

  const currentStep = currentFlow?.steps[currentStepIndex];
  const targetElement = currentStep ? targetElements.get(currentStep.targetId) : undefined;

  const contextValue: CoachMarkContextValue = {
    currentFlow,
    currentStepIndex,
    isActive,
    targetElements,
    registerTarget,
    unregisterTarget,
    startFlow,
    nextStep,
    previousStep,
    skipFlow,
    completeStep,
    userProgress,
  };

  return (
    <CoachMarkContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={isActive && !!currentStep && !!targetElement}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {isActive && currentStep && targetElement && (
          <CoachMarkOverlay
            target={targetElement}
            step={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={currentFlow?.steps.length || 0}
            onNext={nextStep}
            onSkip={skipFlow}
            onBackdropPress={currentStep.skipEnabled !== false ? skipFlow : undefined}
          />
        )}
      </Modal>
    </CoachMarkContext.Provider>
  );
}

export function useCoachMarkContext() {
  const context = useContext(CoachMarkContext);
  if (context === undefined) {
    throw new Error('useCoachMarkContext must be used within a CoachMarkProvider');
  }
  return context;
}

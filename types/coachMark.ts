export type CoachMarkPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type CoachMarkHighlightType = 'circle' | 'rectangle';
export type CoachMarkActionType = 'tap' | 'swipe' | 'none';

export interface CoachMarkStep {
  stepId: string;
  targetId: string;
  title: string;
  description: string;
  position: CoachMarkPosition;
  highlightType: CoachMarkHighlightType;
  actionRequired: CoachMarkActionType;
  highlightPadding?: number;
  skipEnabled?: boolean;
  autoAdvanceOnAction?: boolean;
}

export interface CoachMarkFlow {
  flowName: string;
  displayName: string;
  targetScreen: string;
  steps: CoachMarkStep[];
  triggerCondition: string;
  priority: number;
}

export interface TargetElement {
  targetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

export interface UserOnboardingProgress {
  id: string;
  userId: string;
  completedSteps: string[];
  currentFlowName: string | null;
  currentStepIndex: number;
  isOnboardingComplete: boolean;
  lastInteractionAt: string;
  skippedFlows: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingFlowConfig {
  id: string;
  flowName: string;
  displayName: string;
  targetScreen: string;
  stepsConfig: CoachMarkStep[];
  triggerCondition: string;
  isActive: boolean;
  priorityOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoachMarkContextValue {
  currentFlow: CoachMarkFlow | null;
  currentStepIndex: number;
  isActive: boolean;
  targetElements: Map<string, TargetElement>;
  registerTarget: (targetId: string, element: TargetElement) => void;
  unregisterTarget: (targetId: string) => void;
  startFlow: (flowName: string) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  skipFlow: () => Promise<void>;
  completeStep: (stepId: string) => Promise<void>;
  userProgress: UserOnboardingProgress | null;
}

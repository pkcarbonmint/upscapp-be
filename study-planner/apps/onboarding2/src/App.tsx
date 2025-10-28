import { lazy } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";

import  Navigation from "@/components/Navigation";
import PersonalInfoStep from "@/components/PersonalInfoStep";

const TargetYearStep = lazy(() => import("@/components/TargetYearStep"));
const CommitmentStep = lazy(() => import("@/components/StudyPreferencesStep"));
const ConfidenceStep = lazy(() => import("@/components/ConfidenceStep"));
const PreviewStep = lazy(() => import("@/components/PreviewStep"));
const PaymentStep = lazy(() => import("@/components/PaymentStep"));
const CompleteStep = lazy(() => import("@/components/CompleteStep"));


const steps = [
  "personal-info",
  "commitment",
  "confidence",
  "target-year",
  "preview",
  "payment",
  "complete",
];

const stepMap = steps.reduce<Record<string, number>>((acc, step, index) => {
  acc[step] = index + 1;
  return acc;
}, {});

function App() {
  const {
    currentStep,
    formData,
    updateFormData,
    goNext,
    goPrevious,
    canGoNext,
    isSubmitting,
    error,
    progress,
  } = useOnboarding();

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      onNext: goNext,
      onPrevious: goPrevious,
      isValid: canGoNext as boolean,
    };

    switch (currentStep) {
      case "personal-info":
        return <PersonalInfoStep {...stepProps} />;
      case "commitment":
        return <CommitmentStep {...stepProps} />;
      case "confidence":
        return <ConfidenceStep {...stepProps} />;
      case "target-year":
        return <TargetYearStep {...stepProps} />;
      case "preview":
        return <PreviewStep {...stepProps} />;
      case "payment":
        return <PaymentStep {...stepProps} />;
      case "complete":
        return <CompleteStep {...stepProps} />;
      default:
        return <PersonalInfoStep {...stepProps} />;
    }
  };

  const getStepNumber = () => {
    return stepMap[currentStep] || 1;
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--ms-gray-10)" }}
    >
      <Header currentStep={getStepNumber()} totalSteps={7} />
      <ProgressBar progress={progress} />
      <main style={{ padding: "24px 0", minHeight: "calc(100vh - 200px)" }}>
        <div className="container">
          {error && (
            <div
              style={{
                background: "var(--ms-red)",
                color: "var(--ms-white)",
                padding: "12px 16px",
                borderRadius: "4px",
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {renderStep()}

          {currentStep !== "complete" && (
            <Navigation
              currentStep={getStepNumber()}
              totalSteps={steps.length}
              canGoNext={canGoNext as boolean}
              canGoPrevious={getStepNumber() > 1}
              isSubmitting={isSubmitting}
              onNext={goNext}
              onPrevious={goPrevious}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

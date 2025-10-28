import { lazy, useState, Suspense } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Navigation from "@/components/Navigation";
import PersonalInfoStep from "@/components/PersonalInfoStep";

const TargetYearStep = lazy(() => import("@/components/TargetYearStep"));
const CommitmentStep = lazy(() => import("@/components/StudyPreferencesStep"));
const ConfidenceStep = lazy(() => import("@/components/ConfidenceStep"));
const PreviewStep = lazy(() => import("@/components/PreviewStep"));
const PaymentStep = lazy(() => import("@/components/PaymentStep"));
const CompleteStep = lazy(() => import("@/components/CompleteStep"));

// Temporary fixed password
const APP_PASSWORD = "helios4success";

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
  const [isAuthenticated, setIsAuthenticated] = useState(getStoredAuth());
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      const authData = {
        timestamp: new Date().getTime(),
        authenticated: true
      };
      localStorage.setItem('helios-auth', JSON.stringify(authData));

      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const {
    currentStep,
    formData,
    updateFormData,
    goNext,
    goPrevious,
    canGoNext,
    isSubmitting,
    error,
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

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return <PasswordBox />
  }

  return (
    <div className="app-container">
      <Header currentStep={getStepNumber()} totalSteps={7} />
      <main className="app-main">
        <div className="container">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="navigation-spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '16px', color: 'var(--ms-gray-90)' }}>Loading...</p>
            </div>
          }>
            {renderStep()}
          </Suspense>

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
      <Footer currentStep={getStepNumber()} totalSteps={7} />
    </div>
  );
  
  function getStoredAuth() {
    const stored = localStorage.getItem('helios-auth');
    if (!stored) return false;

    try {
      const { timestamp } = JSON.parse(stored);
      const now = new Date().getTime();
      const daysSinceAuth = (now - timestamp) / (1000 * 60 * 60 * 24);

      // Check if authentication is still valid (less than 30 days)
      return daysSinceAuth < 30;
    } catch {
      return false;
    }
  };

  function PasswordBox() {
    return (
      <div className="app-container">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '24px'
        }}>
          <div className="step-card" style={{ maxWidth: '420px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, var(--ms-blue) 0%, var(--ms-purple) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                🔒
              </div>
              <h2 className="step-title" style={{ marginBottom: '8px' }}>
                Secure Access
              </h2>
              <p className="step-description">
                Please enter your password to continue
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="password"
                  className="ms-label"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="ms-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  style={{ marginTop: '4px' }}
                />
              </div>

              {passwordError && (
                <div style={{
                  marginBottom: '16px',
                  fontSize: '14px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--ms-red)',
                  color: 'white',
                  borderRadius: '4px'
                }}>
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className="ms-button ms-button-primary"
                style={{ width: '100%', padding: '10px 24px' }}
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };
}

export default App;

import { lazy, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import Header from "@/components/Header";

import  Navigation from "@/components/Navigation";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
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
    return (
      <div className="app-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h2 style={{ 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              color: '#333'
            }}>
              App Login
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label 
                  htmlFor="password" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#555'
                  }}
                >
                  Enter Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
              {passwordError && (
                <div style={{
                  color: '#e74c3c',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  {passwordError}
                </div>
              )}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#0056b3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff';
                }}
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
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

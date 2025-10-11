import React from 'react';
import type { FormData } from '../types';

interface FinalStepProps {
  formData: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
}

const FinalStep: React.FC<FinalStepProps> = () => {
  // Mock final step data - in real app this would come from form submission result
  const mockFinalData = {
    submitted: true,
    message: "Your study plan has been successfully generated and saved.",
    studentId: "A1B2C3"  // New 6-character hex format
  };

  const handleShareApp = () => {
    // Mock share functionality
    if (navigator.share) {
      navigator.share({
        title: 'La Mentora UPSC Study Planner',
        text: 'Get your personalized UPSC study plan with La Mentora!',
        url: window.location.origin
      });
    } else {
      // Fallback for browsers without Web Share API
      const shareText = `Get your personalized UPSC study plan with La Mentora! ${window.location.origin}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Share link copied to clipboard!');
      });
    }
  };

  if (mockFinalData.submitted) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900">🎉 Congratulations! Your Study Plan is Ready!</h3>
        <p className="text-gray-600">
          Your personalized UPSC study plan has been created and will be reviewed by our expert mentors.
          You will receive the detailed plan within 2-4 days.
        </p>

        {mockFinalData.message && (
          <p className="text-gray-700">{mockFinalData.message}</p>
        )}

        {mockFinalData.studentId && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Student ID: </span>
            {mockFinalData.studentId}
          </p>
        )}

        {/* Share section */}
        <div className="bg-blue-50 border border-blue-200 p-4 mt-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Help others succeed too!!!</h4>
          <p className="text-sm text-blue-700 mb-3">
            Share Study Planner with your friends preparing for UPSC and help them get their personalized study plans.
            <div className="mt-3 flex items-center space-x-4">
              <a
                href={`${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(mockFinalData.studentId)}`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-share mr-2"></i>
                Share with Friends
              </a>
              <div className="flex-1 flex justify-end">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?ref=' + encodeURIComponent(mockFinalData.studentId))}`}
                  alt="Share La Mentora QR"
                  className="w-20 h-20 border border-blue-200 rounded"
                />
              </div>
            </div>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <p className="text-gray-600">
        Review your information and click Complete Setup to generate your personalized study plan.
      </p>
      <div className="bg-gray-50 border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Know someone else preparing for UPSC?</h4>
        <p className="text-sm text-gray-600 mb-3">
          Share the Study Planner with friends preparing for UPSC and help them get a personalized study plan too.
          <div className="mt-3 flex items-center space-x-4">
            <span className="text-xs text-gray-500">Scan to share:</span>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + window.location.pathname)}`}
              alt="Share La Mentora QR"
              className="w-20 h-20 border border-gray-200 rounded"
            />
          </div>
        </p>
        <button
          onClick={handleShareApp}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <i className="fas fa-share mr-2"></i>
          Share App
        </button>
      </div>
    </div>
  );
};

export default FinalStep;

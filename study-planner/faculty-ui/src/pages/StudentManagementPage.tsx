import React from 'react';
import { StudentList, CrossAppNavigation } from 'shared-ui-library';
import { Users } from 'lucide-react';

const StudentManagementPage: React.FC = () => {
  const handleStudentSelect = (student: any) => {
    console.log('Selected student:', student);
    // Could navigate to student detail page or open modal
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
        </div>
        <p className="text-gray-600">
          View and manage student profiles, onboarding progress, and study plans.
        </p>
      </div>

      {/* Cross-app Navigation */}
      <CrossAppNavigation currentApp="faculty" />

      {/* Student List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <StudentList 
          onStudentSelect={handleStudentSelect}
          showActions={true}
        />
      </div>
    </div>
  );
};

export default StudentManagementPage;

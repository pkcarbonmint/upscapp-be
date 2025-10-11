import { useQuery } from 'react-query';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp
} from 'lucide-react';
import { facultyApi } from '../services/api';
import { DashboardStats } from '../types';

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>(
    'dashboard-stats',
    () => facultyApi.getDashboardStats(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Plans',
      value: stats?.totalPlans || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Pending Review',
      value: stats?.pendingReview || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      name: 'Approved Today',
      value: stats?.approvedToday || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      name: 'Rejected Today',
      value: stats?.rejectedToday || 0,
      icon: XCircle,
      color: 'bg-red-500',
    },
    {
      name: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Active Students',
      value: stats?.activeStudents || 0,
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of study plans and student activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/faculty/plans/review"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-primary-50 text-primary-700 ring-4 ring-white">
                <FileText className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Review Plans
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Review and approve student study plans
              </p>
            </div>
          </a>

          <a
            href="/faculty/students"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-primary-50 text-primary-700 ring-4 ring-white">
                <Users className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Manage Students
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                View and manage student accounts
              </p>
            </div>
          </a>

          <a
            href="/faculty/plans/review?status=pending"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-primary-50 text-primary-700 ring-4 ring-white">
                <Clock className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" />
                Pending Reviews
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                View plans awaiting your review
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-sm text-gray-500">
          Recent activity will be displayed here once the backend is implemented.
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

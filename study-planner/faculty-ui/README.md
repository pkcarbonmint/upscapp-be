# Faculty Dashboard - UPSC Study Planner

A React-based faculty dashboard for managing and reviewing student study plans in the UPSC Study Planner application.

## Features

- **Faculty Authentication**: Secure login system for faculty members
- **Dashboard**: Overview of study plans and student activity
- **Plan Review**: Review, approve, or reject student study plans
- **Student Management**: View and manage student accounts
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **React Query** for data fetching and caching
- **React Hook Form** for form handling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API communication

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Building for Production

```bash
npm run build
```

## Project Structure

```
faculty-ui/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.tsx      # Main layout with sidebar
│   │   └── LoadingSpinner.tsx
│   ├── pages/              # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PlanReviewPage.tsx
│   │   └── StudentManagementPage.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useFacultyAuth.ts
│   ├── services/           # API services
│   │   └── api.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API Integration

The faculty app integrates with the backend API through the following endpoints:

- `POST /api/studyplanner/faculty/auth/login` - Faculty login
- `GET /api/studyplanner/faculty/auth/profile` - Get faculty profile
- `GET /api/studyplanner/faculty/dashboard/stats` - Dashboard statistics
- `GET /api/studyplanner/faculty/plans/review` - Get plans for review
- `PUT /api/studyplanner/faculty/plans/{id}/approve` - Approve plan
- `PUT /api/studyplanner/faculty/plans/{id}/reject` - Reject plan
- `GET /api/studyplanner/faculty/students` - Get students list

## Authentication

The app uses JWT tokens stored in localStorage for authentication. The token is automatically included in API requests and the user is redirected to login if the token is invalid.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

The app expects the backend API to be running on `http://localhost:8000`. This can be configured in `vite.config.ts`.

## Deployment

The faculty app is designed to be deployed as a static site. The build output in the `dist/` directory can be served by any static file server or CDN.

## Security Considerations

- JWT tokens are stored in localStorage
- API requests include authentication headers
- Automatic logout on authentication errors
- Role-based access control (faculty only)

## Future Enhancements

- Real-time notifications for new plan submissions
- Advanced filtering and search capabilities
- Bulk operations for plan management
- Export functionality for reports
- Integration with plan editor library for inline editing

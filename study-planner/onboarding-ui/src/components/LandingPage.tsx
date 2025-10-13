import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Star, CheckCircle, Calendar, BookOpen, Target, Users, ArrowRight } from 'lucide-react';
import { analytics } from '../services/analytics';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [visibleStats, setVisibleStats] = useState(false);

  useEffect(() => {
    // Trigger stats animation after component mounts
    const timer = setTimeout(() => setVisibleStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    analytics.track('landing_cta_clicked', { button_location: 'hero' });
    onGetStarted();
  };

  const handleSecondaryGetStarted = () => {
    analytics.track('landing_cta_clicked', { button_location: 'features' });
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-100 rounded-full opacity-60 blur-xl"></div>
          <div className="absolute top-32 right-16 w-32 h-32 bg-indigo-100 rounded-full opacity-40 blur-2xl"></div>
          <div className="absolute bottom-16 left-1/4 w-24 h-24 bg-purple-100 rounded-full opacity-50 blur-xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
              <Star className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" />
              Trusted by 1000+ UPSC aspirants
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your Personalized
              <span className="block text-blue-600">UPSC Study Plan</span>
              <span className="block text-gray-700">Starts Here</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Get an AI-powered study timeline that adapts to your schedule, strengths, and target exam year. 
              Join thousands of successful UPSC candidates.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="px-8 py-6 text-lg h-14 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Create My Study Plan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="text-gray-500 text-sm">
                ✅ Free personalized plan in 3 minutes
              </div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {[
                { number: '1000+', label: 'Students Enrolled' },
                { number: '95%', label: 'Success Rate' },
                { number: '3min', label: 'Setup Time' },
                { number: '24/7', label: 'AI Support' }
              ].map((stat, index) => (
                <div 
                  key={index} 
                  className={`text-center transform transition-all duration-700 ${
                    visibleStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl font-bold text-blue-600">{stat.number}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Study Planner?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Backed by years of UPSC coaching expertise and powered by AI to give you the edge you need
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8 text-blue-600" />,
                title: 'Personalized Timeline',
                description: 'Get a custom study plan based on your target year, available hours, and current preparation level.',
                benefits: ['Adaptive scheduling', 'Milestone tracking', 'Progress optimization']
              },
              {
                icon: <BookOpen className="w-8 h-8 text-green-600" />,
                title: 'Subject-Wise Strategy',
                description: 'AI analyzes your strengths and weaknesses to prioritize subjects and topics for maximum impact.',
                benefits: ['Weakness analysis', 'Smart prioritization', 'Topic-level planning']
              },
              {
                icon: <Calendar className="w-8 h-8 text-purple-600" />,
                title: 'Flexible Scheduling',
                description: 'Accommodates your college, job, or other commitments while ensuring consistent progress.',
                benefits: ['Work-life balance', 'Flexible timings', 'Consistent progress']
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow duration-300">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get Your Study Plan in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              No complex setups. Just smart questions that help us understand your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Share Your Background',
                description: 'Tell us about your current preparation level, available time, and target exam year.',
                color: 'blue'
              },
              {
                step: '02',
                title: 'AI Analysis',
                description: 'Our algorithm analyzes your inputs and creates a personalized study strategy.',
                color: 'green'
              },
              {
                step: '03',
                title: 'Start Studying',
                description: 'Get your detailed timeline with daily tasks, milestones, and progress tracking.',
                color: 'purple'
              }
            ].map((step, index) => (
              <div key={index} className="text-center relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-300 z-0"></div>
                )}
                <div className={`relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-${step.color}-600 text-white flex items-center justify-center text-xl font-bold`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Future Civil Servants
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Priya Sharma',
                role: 'AIR 47, CSE 2023',
                quote: 'The personalized timeline helped me balance my job and UPSC prep effectively. Highly recommend!',
                rating: 5
              },
              {
                name: 'Rahul Kumar',
                role: 'AIR 123, CSE 2023',
                quote: 'Finally, a study plan that actually adapts to my weaknesses. The AI recommendations were spot-on.',
                rating: 5
              },
              {
                name: 'Ananth Krishnan',
                role: 'AIR 89, CSE 2022',
                quote: 'Structured approach with flexibility - exactly what I needed for my second attempt.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your UPSC Preparation?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of aspirants who are already using our AI-powered study plans to achieve their dreams.
          </p>
          
          <Button 
            onClick={handleSecondaryGetStarted}
            size="lg"
            variant="outline"
            className="px-8 py-6 text-lg h-14 bg-white text-blue-600 border-white hover:bg-blue-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Your Journey Today
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          
          <div className="mt-6 text-blue-200 text-sm">
            100% Free • No Credit Card Required • Setup in 3 Minutes
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <span className="text-2xl font-bold text-white">La Mentora</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering UPSC aspirants with AI-driven study plans and expert guidance
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span>© 2024 La Mentora. All rights reserved.</span>
              <span>•</span>
              <span>Made with ❤️ for UPSC aspirants</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
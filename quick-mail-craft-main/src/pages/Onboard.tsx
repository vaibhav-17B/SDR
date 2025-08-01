import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Mail, 
  Users, 
  Zap, 
  BarChart3, 
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const Onboard = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Target,
      title: "Lead Discovery",
      description: "Find and identify potential prospects with precision targeting and advanced filtering capabilities."
    },
    {
      icon: Mail,
      title: "AI Email Composer",
      description: "Generate personalized, professional emails using AI-powered content creation and tone matching."
    },
    {
      icon: Users,
      title: "Contact Management",
      description: "Organize and manage your prospect database with comprehensive contact information."
    },
    {
      icon: Zap,
      title: "Automated Workflows",
      description: "Streamline your outreach process with automated email sequences and follow-ups."
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track performance metrics and gain insights into your outreach campaigns."
    },
    {
      icon: Shield,
      title: "Data Security",
      description: "Enterprise-grade security to protect your sensitive business data and communications."
    }
  ];

  const capabilities = [
    "Advanced lead discovery and qualification",
    "AI-powered email generation and personalization",
    "Multi-channel outreach campaigns",
    "Real-time analytics and reporting",
    "CRM integration and data synchronization",
    "Automated follow-up sequences"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Sales Development
              <span className="block text-gray-600">Reimagined</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your sales process with AI-powered lead discovery and email composition. 
              Build meaningful connections that drive revenue growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white"
                onClick={() => navigate('/user-info')}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={() => navigate('/studio')}
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools designed to streamline your sales development process 
              and maximize your outreach effectiveness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-gray-900" />
                    </div>
                    <CardTitle className="text-gray-900">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Platform Capabilities
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform combines advanced technology with intuitive design to deliver 
                exceptional results for sales teams of all sizes.
              </p>
              
              <div className="space-y-4">
                {capabilities.map((capability, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-gray-900 flex-shrink-0" />
                    <span className="text-gray-700">{capability}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button 
                  size="lg"
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => navigate('/user-info')}
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-100 rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                  <div className="space-y-2 mt-6">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Sales Process?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of sales professionals who have already revolutionized 
            their outreach with our platform.
          </p>
          <Button 
            size="lg"
            className="bg-white text-gray-900 hover:bg-gray-100"
            onClick={() => navigate('/user-info')}
          >
            Get Started Today
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboard;
import React from 'react';
import { Github, Linkedin, Twitter, Mail, Globe, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: 'https://www.linkedin.com/company/basal-analytics',
      color: 'hover:text-blue-600'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: 'https://twitter.com/basalanalytics',
      color: 'hover:text-blue-400'
    },
    {
      name: 'GitHub',
      icon: Github,
      url: 'https://github.com/basalanalytics',
      color: 'hover:text-gray-700'
    },
    {
      name: 'Website',
      icon: Globe,
      url: 'https://basalanalytics.com',
      color: 'hover:text-green-600'
    },
    {
      name: 'Email',
      icon: Mail,
      url: 'mailto:contact@basalanalytics.com',
      color: 'hover:text-red-500'
    }
  ];

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Demo', href: '/studio' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '#about' },
        { name: 'Blog', href: '#blog' },
        { name: 'Contact', href: '#contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', href: '#docs' },
        { name: 'Help Center', href: '#help' },
        { name: 'Status', href: '#status' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '#privacy' },
        { name: 'Terms of Service', href: '#terms' },
        { name: 'Cookie Policy', href: '#cookies' }
      ]
    }
  ];

  return (
    <footer className="bg-gray-900 text-white shadow-2xl mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold text-sm">SDR</span>
              </div>
              <span className="text-xl font-bold">Sales Development</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Transform your sales process with AI-powered lead discovery and email composition. 
              Build meaningful connections that drive revenue growth.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-gray-400 ${social.color} transition-colors duration-200 transform hover:scale-110`}
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-1 text-sm text-gray-300 mb-4 md:mb-0">
              <span>© {currentYear} Basal Analytics. Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for sales teams everywhere.</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-300">
              <span>All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Version 1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
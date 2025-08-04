
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Copy, User, Briefcase, GraduationCap, Brain, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface Lead {
  [key: string]: any;
  email_list?: string[];
}

interface LeadDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSelectEmails: (emails: string[]) => void;
}

const LeadDetailsDialog = ({ isOpen, onClose, lead, onSelectEmails }: LeadDetailsDialogProps) => {
  if (!lead) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(lead, null, 2));
    toast.success('JSON copied to clipboard');
  };

  const handleSelectEmails = () => {
    const emails = [];
    if (lead.personal_information?.primary_professional_email) {
      emails.push(lead.personal_information.primary_professional_email);
    }
    if (lead.contact_information?.primary_email && !emails.includes(lead.contact_information.primary_email)) {
      emails.push(lead.contact_information.primary_email);
    }
    
    if (emails.length > 0) {
      onSelectEmails(emails);
      toast.success(`${emails.length} email(s) selected for composer`);
      onClose();
    } else {
      toast.error('No emails found for this lead');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-2 border-gray-900 shadow-2xl rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-700 bg-gray-900 text-white">
          <DialogTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold">Lead Details</span>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleCopyJson} variant="outline" size="sm" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100">
                <Copy className="w-4 h-4 mr-2" />
                Copy JSON
              </Button>
              {(lead.personal_information?.primary_professional_email || lead.contact_information?.primary_email) && (
                <Button onClick={handleSelectEmails} size="sm" className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-100">
                  <Mail className="w-4 h-4 mr-2" />
                  Use Email
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white rounded-b-xl">
          {/* Profile Header */}
          <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex-shrink-0">
              {lead.personal_information?.picture_url ? (
                <img 
                  src={lead.personal_information.picture_url} 
                  alt={lead.personal_information?.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-xl ring-2 ring-gray-100">
                  <User className="w-12 h-12 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-grow">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{lead.personal_information?.full_name || 'Unknown Name'}</h2>
              <p className="text-lg font-semibold text-gray-700 mb-1">{lead.current_position?.title || 'No position'}</p>
              <p className="text-gray-600 mb-3">{lead.work_experience?.[0]?.company_name || 'No company'}</p>
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700 font-medium">{lead.personal_information?.primary_professional_email || lead.contact_information?.primary_email || 'No email'}</span>
                </div>
                {lead.personal_information?.linkedin_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(lead.personal_information.linkedin_url, '_blank')}
                    className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>LinkedIn</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
         {lead.personal_information && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
          {lead.personal_information.professional_headline && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Headline</span>
              <p className="text-gray-900 font-medium mt-1">
                {lead.personal_information.professional_headline}
              </p>
            </div>
          )}
          {lead.personal_information.location?.full_location && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Location</span>
              <p className="text-gray-900 font-medium mt-1">
                {lead.personal_information.location.full_location}
              </p>
            </div>
          )}
          {lead.personal_information.professional_summary && (
            <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Summary</span>
              <p className="text-gray-900 mt-1 leading-relaxed">
                {lead.personal_information.professional_summary}
              </p>
            </div>
          )}
          </div>
        </div>
      )}

          {/* Current Position */}
          {lead.current_position && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Briefcase className="w-5 h-5 text-gray-600" />
                </div>
                Current Position
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</span>
                  <p className="text-gray-900 font-medium mt-1">{lead.current_position.title}</p>
                </div>
                {lead.current_position.department && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</span>
                    <p className="text-gray-900 font-medium mt-1">{lead.current_position.department}</p>
                  </div>
                )}
                {lead.current_position.management_level && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Management Level</span>
                    <p className="text-gray-900 font-medium mt-1">{lead.current_position.management_level}</p>
                  </div>
                )}
                {lead.current_position.total_experience_years && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Experience</span>
                    <p className="text-gray-900 font-medium mt-1">
                      {lead.current_position.total_experience_years} years
                      {lead.current_position.total_experience_remaining_months && (
                        <span className="text-gray-600"> {lead.current_position.total_experience_remaining_months} months</span>
                      )}
                    </p>
                  </div>
                )}
                {lead.current_position.description && (
                  <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</span>
                    <p className="text-gray-900 mt-1 leading-relaxed">{lead.current_position.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {lead.work_experience && lead.work_experience.length > 0 && (
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-primary" />
                Work Experience
              </h3>
              <div className="space-y-4">
                {lead.work_experience.map((exp: any, index: number) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">{exp.position_title}</h4>
                        <p className="text-muted-foreground">{exp.company_name}</p>
                        <p className="text-sm text-muted-foreground">{exp.duration}</p>
                        {exp.location && (
                          <p className="text-sm text-muted-foreground">{exp.location}</p>
                        )}
                      </div>
                      {exp.is_current && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Current</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {lead.educational_background && lead.educational_background.length > 0 && (
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-primary" />
                Education
              </h3>
              <div className="space-y-3">
                {lead.educational_background.map((edu: any, index: number) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-4">
                    <h4 className="font-medium text-foreground">{edu.degree}</h4>
                    <p className="text-muted-foreground">{edu.institution}</p>
                    <p className="text-sm text-muted-foreground">{edu.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {lead.skills_and_expertise?.inferred_skills && lead.skills_and_expertise.inferred_skills.length > 0 && (
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-primary" />
                Skills & Expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {lead.skills_and_expertise.inferred_skills.map((skill: string, index: number) => (
                  <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Raw JSON Section */}
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h3 className="font-semibold text-foreground mb-2">Raw JSON Data:</h3>
            <div className="max-h-96 overflow-y-auto">
              <pre className="text-xs bg-background p-3 rounded border overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(lead, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;

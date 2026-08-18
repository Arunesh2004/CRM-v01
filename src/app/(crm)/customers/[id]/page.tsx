import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerByIdAction } from '@/modules/crm/actions/customer.actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Globe, Users2, Activity, PenSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CommunicationActions from './CommunicationActions';
import { CustomerActivityTimeline } from '@/components/crm/CustomerActivityTimeline';
import { CustomerRelatedItems } from '@/components/crm/CustomerRelatedItems';
import { getCustomerTimelineAction } from '@/modules/crm/actions/customer.actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ContactForm } from '@/components/crm/ContactForm';
import { LocationForm } from '@/components/crm/LocationForm';
import { getDocumentsForCustomer } from '@/modules/crm/document/document.service';
import { DocumentList } from '@/components/crm/DocumentList';
import { DocumentUploader } from '@/components/crm/DocumentUploader';
import { TimelineTabWrapper } from './TimelineTabWrapper';
import { DocumentsTabWrapper } from './DocumentsTabWrapper';
import { EditCustomerForm } from '@/components/crm/EditCustomerForm';

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const result = await getCustomerByIdAction(params.id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const customer = result.data;
  const locations = customer.locations || [];
  const contacts = customer.contacts || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-8">
      
      {/* Page Header */}
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/customers" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Customers
        </Link>
      </div>

      <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight max-w-2xl truncate" title={customer.name}>{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#8891B0]">
              <span className="font-medium text-white">{customer.industry || 'Unspecified Industry'}</span>
              <span>•</span>
              <Badge variant={customer.status === 'ACTIVE' ? 'emerald' : 'slate'}>{customer.status}</Badge>
            </div>
          </div>
        </div>
        <div className="relative z-10 shrink-0 flex gap-2">

          <EditCustomerForm customer={customer} />
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="bg-[#0D1326]/50 border border-white/[.04]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-display font-semibold text-white mb-4">Company Overview</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-8">
                  <div>
                    <div className="text-xs text-[#8891B0] mb-1 uppercase tracking-wider font-semibold">Primary Contact</div>
                    <div className="flex items-center font-medium text-white">
                      <Phone className="w-4 h-4 mr-2 text-violet-400" />
                      {contacts.find((c: any) => c.isPrimary)?.phone || 'No primary phone'}
                    </div>
                  </div>
                </div>
              </div>
              <CustomerRelatedItems tasks={customer.tasks} leads={customer.relatedLeads} />
            </div>
            <div className="space-y-6">
              <CommunicationActions customerId={customer.id} contacts={contacts} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="glass-panel p-6">
            <div className="flex flex-row items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-white flex items-center">
                <Users2 className="w-5 h-5 mr-2 text-violet-400" />
                Key Contacts
              </h3>
              <ContactForm customerId={customer.id} />
            </div>
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#8891B0] bg-white/[.02] border border-white/[.04] rounded-xl">
                No contacts have been added yet.
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {contacts.map((contact: any) => (
                  <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-white/[.08] rounded-xl hover:border-violet-500/30 transition-colors bg-[#0D1326]/40 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm shrink-0 border border-violet-500/30">
                        {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {contact.firstName} {contact.lastName}
                          {contact.isPrimary && <Badge variant="emerald" className="text-[10px] uppercase py-0.5 px-1.5 h-auto">Primary</Badge>}
                        </div>
                        <div className="text-xs text-[#8891B0] font-medium mt-0.5">{contact.jobTitle || 'No Title'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:items-end text-sm text-[#8891B0] shrink-0">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          <a href={`mailto:${contact.email}`} className="hover:text-violet-400 transition-colors truncate max-w-[200px]">{contact.email}</a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 opacity-60" />
                          <a href={`tel:${contact.phone}`} className="hover:text-violet-400 transition-colors truncate max-w-[200px]">{contact.phone}</a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <div className="glass-panel p-6">
            <div className="flex flex-row items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-white flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-violet-400" />
                Locations
              </h3>
              <LocationForm customerId={customer.id} />
            </div>
            {locations.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#8891B0] bg-white/[.02] border border-white/[.04] rounded-xl">
                No locations have been added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {locations.map((loc: any) => (
                  <div key={loc.id} className="border border-white/[.08] rounded-xl p-5 bg-[#0D1326]/40 hover:border-violet-500/30 transition-colors">
                    <div className="font-semibold text-white mb-2 flex items-center justify-between">
                      {loc.name}
                    </div>
                    <address className="text-sm text-[#8891B0] not-italic leading-relaxed">
                      {loc.address && <div>{loc.address}</div>}
                      {(loc.city || loc.state) && <div>{loc.city}{loc.city && loc.state ? ', ' : ''}{loc.state} {loc.zip}</div>}
                    </address>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Suspense fallback={
            <div className="glass-panel p-6 flex items-center justify-center min-h-[200px]">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <DocumentsTabWrapper customerId={customer.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="timeline">
          <Suspense fallback={
            <div className="glass-panel p-6 flex items-center justify-center min-h-[200px]">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <TimelineTabWrapper customerId={customer.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

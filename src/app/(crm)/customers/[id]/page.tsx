import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerByIdAction } from '@/modules/crm/actions/customer.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const result = await getCustomerByIdAction(params.id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const customer = result.data;
  const locations = customer.locations || [];
  const contacts = customer.contacts || [];

  const timelineResult = await getCustomerTimelineAction({ customerId: customer.id, limit: 100 });
  const timelineEvents = timelineResult.success ? (timelineResult.data as any).data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Page Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/customers" className="hover:text-primary transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Customers
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-md shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight max-w-2xl truncate" title={customer.name}>{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{customer.industry || 'Unspecified Industry'}</span>
              <span>•</span>
              <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>{customer.status}</Badge>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex gap-2">
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Log Activity
          </Button>
          <Button>
            <PenSquare className="w-4 h-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-8">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Primary Contact</div>
                      <div className="flex items-center font-medium">
                        <Phone className="w-4 h-4 mr-2 opacity-50" />
                        {contacts.find((c: any) => c.isPrimary)?.phone || 'No primary phone'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <CustomerRelatedItems tasks={customer.tasks} leads={customer.relatedLeads} />
            </div>
            <div className="space-y-6">
              <CommunicationActions customerId={customer.id} contacts={contacts} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center">
                <Users2 className="w-5 h-5 mr-2 text-primary" />
                Key Contacts
              </CardTitle>
              <ContactForm customerId={customer.id} />
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No contacts have been added yet.
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {contacts.map((contact: any) => (
                    <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:border-accent transition-colors bg-card gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary && <Badge variant="success" className="text-[10px] uppercase">Primary</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">{contact.jobTitle || 'No Title'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:items-end text-sm text-muted-foreground shrink-0">
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 opacity-60" />
                            <a href={`mailto:${contact.email}`} className="hover:text-accent truncate max-w-[200px]">{contact.email}</a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 opacity-60" />
                            <a href={`tel:${contact.phone}`} className="hover:text-accent truncate max-w-[200px]">{contact.phone}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                Locations
              </CardTitle>
              <LocationForm customerId={customer.id} />
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No locations have been added yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {locations.map((loc: any) => (
                    <div key={loc.id} className="border rounded-lg p-4 bg-muted/20 hover:border-accent transition-colors">
                      <div className="font-semibold text-foreground mb-1 flex items-center justify-between">
                        {loc.name}
                      </div>
                      <address className="text-sm text-muted-foreground not-italic leading-relaxed">
                        {loc.address && <div>{loc.address}</div>}
                        {(loc.city || loc.state) && <div>{loc.city}{loc.city && loc.state ? ', ' : ''}{loc.state} {loc.zip}</div>}
                      </address>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unified Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerActivityTimeline activities={timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

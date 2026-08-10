import { Skeleton } from './Skeleton';
import { Card, CardContent, CardHeader } from './Card';

export function PageSkeleton({ type = 'list' }: { type?: 'list' | 'detail' | 'kanban' | 'dashboard' }) {
  if (type === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'kanban') {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="flex space-x-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-80 space-y-4 shrink-0">
              <Skeleton className="h-12 w-full rounded-t-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton className="h-4 w-[120px] mb-4" />
        <div className="flex justify-between items-end pb-6 border-b">
          <div className="flex gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-[300px]" />
              <Skeleton className="h-5 w-[200px]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Default List View (Customers, Employees, etc)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <Card>
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <div className="border rounded-md">
             <div className="border-b p-4 flex gap-4">
               <Skeleton className="h-6 flex-1" />
               <Skeleton className="h-6 flex-1" />
               <Skeleton className="h-6 flex-1" />
               <Skeleton className="h-6 flex-1" />
             </div>
             {[1,2,3,4,5].map(i => (
               <div key={i} className="border-b p-4 flex gap-4">
                 <Skeleton className="h-6 flex-1" />
                 <Skeleton className="h-6 flex-1" />
                 <Skeleton className="h-6 flex-1" />
                 <Skeleton className="h-6 flex-1" />
               </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

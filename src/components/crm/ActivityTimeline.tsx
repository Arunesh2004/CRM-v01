'use client';

export default function ActivityTimeline({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) {
    return <div className="text-sm text-slate-500 italic py-4">No activities recorded.</div>;
  }

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {activities.map((activity: any) => (
        <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-50 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8ZM6.81 11.239l-3.32-3.32a.75.75 0 0 1 1.06-1.06l2.26 2.26 5.25-5.25a.75.75 0 0 1 1.06 1.06l-6.31 6.31Z" /></svg>
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-slate-900">{activity.type}</div>
              <time className="font-caveat font-medium text-indigo-500">{new Date(activity.createdAt).toLocaleDateString()}</time>
            </div>
            <div className="text-slate-500 text-sm">{activity.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

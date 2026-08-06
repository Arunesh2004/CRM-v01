export default function UsersPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Workspace Members</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm">Invite User</button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="py-3 px-6 font-medium">User</th>
              <th className="py-3 px-6 font-medium">Role</th>
              <th className="py-3 px-6 font-medium">Status</th>
              <th className="py-3 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800 divide-y">
            <tr className="hover:bg-gray-50">
              <td className="py-4 px-6">
                <div className="font-medium text-gray-900">Alice Admin</div>
                <div className="text-xs text-gray-500">alice@acme.com</div>
              </td>
              <td className="py-4 px-6"><span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">Admin</span></td>
              <td className="py-4 px-6"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span></td>
              <td className="py-4 px-6 text-right">
                <button className="text-blue-600 hover:underline mx-2">Edit Role</button>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-4 px-6">
                <div className="font-medium text-gray-900">Bob Sales</div>
                <div className="text-xs text-gray-500">bob@acme.com</div>
              </td>
              <td className="py-4 px-6"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Member</span></td>
              <td className="py-4 px-6"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span></td>
              <td className="py-4 px-6 text-right">
                <button className="text-blue-600 hover:underline mx-2">Edit Role</button>
                <button className="text-red-600 hover:underline mx-2">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

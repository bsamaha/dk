import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';


const Sidebar = () => {
  // Get metadata for sidebar stats
  const { data: metadata, isLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: apiService.getMetadata,
  });

  return (
    <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        {/* Dataset Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-2">
            Dataset Overview
          </h2>
          <div className="text-xs text-gray-500 mb-4">Last Updated: June 27, 2025</div>
          {isLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
              <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : metadata ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Players:</span>
                <span className="font-medium text-navy-900">
                  {metadata.total_players.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Drafts:</span>
                <span className="font-medium text-navy-900">
                  {metadata.total_drafts.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Teams:</span>
                <span className="font-medium text-navy-900">
                  {metadata.total_teams.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Failed to load metadata</div>
          )}
        </div>


      </div>
    </aside>
  );
};

export default Sidebar;

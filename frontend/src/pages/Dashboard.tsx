import React, { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { Chip } from "@heroui/react";
import MainLayout from "../layouts/MainLayout";

interface StatsResponse {
  total_uploads: number;
  daily_uploads: Array<{
    count: number;
    date: string;
  }>;
  file_types: Array<{
    file_extension: string;
    count: number;
  }>;
  error_count: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getLast24HourUploads = () => {
    if (!stats?.daily_uploads) return 0;
    
    // Get yesterday's date in the same format as in daily_uploads
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayData = stats.daily_uploads.find(item => item.date === yesterdayStr);
    return yesterdayData?.count || 0;
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <span className="loading">Loading stats...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div>
                <h3 className="text-lg font-medium">Total Uploads</h3>
              </div>
              <div>
                <div className="text-4xl font-bold">{stats?.total_uploads || 0}</div>
                <p className="text-muted-foreground mt-2">All time image uploads</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div>
                <h3 className="text-lg font-medium">Last 24 Hours</h3>
              </div>
              <div>
                <div className="text-4xl font-bold">{getLast24HourUploads()}</div>
                <p className="text-muted-foreground mt-2">Images uploaded in the last 24h</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div>
                <h3 className="text-lg font-medium">File Types</h3>
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  {stats?.file_types && stats.file_types.map((type, index) => (
                    <Chip key={index} variant="solid">
                      {type.file_extension}: {type.count}
                    </Chip>
                  ))}
                </div>
              </div>
            </Card>
            
            <Card className="md:col-span-2 lg:col-span-3 p-6">
              <div>
                <h3 className="text-lg font-medium">Upload Trends (Last 7 Days)</h3>
              </div>
              <div>
                <div className="h-80 flex items-end gap-2">
                  {stats?.daily_uploads && stats.daily_uploads.map((day, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-primary w-12 rounded-t" 
                        style={{ 
                          height: `${day.count > 0 ? (day.count / Math.max(...stats.daily_uploads.map(d => d.count)) * 200) : 0}px`,
                          minHeight: day.count > 0 ? '20px' : '0'
                        }}
                      ></div>
                      <div className="text-xs mt-2">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-xs font-bold">{day.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard; 
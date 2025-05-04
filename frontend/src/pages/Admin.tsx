import React, { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Tabs } from "@heroui/react";
import MainLayout from "../layouts/MainLayout";

interface Log {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source: string;
  details: string;
}

interface LogsResponse {
  logs: Log[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface Error {
  id: number;
  timestamp: string;
  severity: string;
  message: string;
  resolved: boolean;
  details: string;
}

interface ErrorsResponse {
  errors: Error[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const Admin = () => {
  // Logs state
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsFilters, setLogsFilters] = useState({
    level: "",
    search: "",
    date_from: "",
    date_to: ""
  });

  // Errors state
  const [errors, setErrors] = useState<ErrorsResponse | null>(null);
  const [errorsLoading, setErrorsLoading] = useState(true);
  const [includeResolved, setIncludeResolved] = useState(false);

  // Fetch logs with filters
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: logsPage.toString(),
        per_page: "50",
        ...Object.fromEntries(
          Object.entries(logsFilters).filter(([_, value]) => value !== "")
        )
      });

      const response = await fetch(`/api/logs?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch errors
  const fetchErrors = async () => {
    setErrorsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        include_resolved: includeResolved.toString()
      });

      const response = await fetch(`/api/errors?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch errors");
      }
      
      const data = await response.json();
      setErrors(data);
    } catch (error) {
      console.error("Error fetching errors:", error);
    } finally {
      setErrorsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchErrors();
  }, [logsPage, includeResolved]);

  // Apply log filters
  const applyLogFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setLogsPage(1); // Reset to first page
    fetchLogs();
  };

  // Reset log filters
  const resetLogFilters = () => {
    setLogsFilters({
      level: "",
      search: "",
      date_from: "",
      date_to: ""
    });
    setLogsPage(1);
    fetchLogs();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get error severity color
  const getErrorSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-red-500 bg-red-50 border-red-100';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 border-yellow-100';
      case 'low':
        return 'text-blue-500 bg-blue-50 border-blue-100';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Admin</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column - Settings */}
          <div className="lg:col-span-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Site URL</label>
                      <Input
                        type="text"
                        placeholder="https://i.syl.rest"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">The base URL for your uploads</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Upload Directory</label>
                      <Input
                        type="text"
                        placeholder="/var/www/html/uploads"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">Where uploads are stored on the server</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Security</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Admin Password</label>
                      <div className="flex space-x-2">
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="flex-1"
                          disabled
                        />
                        <Button variant="solid" disabled>
                          Change
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Password for accessing this admin panel</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Upload Secret</label>
                      <div className="flex space-x-2">
                        <Input
                          type="password"
                          placeholder="••••••••••••••••"
                          className="flex-1"
                          disabled
                        />
                        <Button variant="solid" disabled>
                          Change
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Secret key for authenticating uploads</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Maintenance</h3>
                  <div className="space-y-4">
                    <div>
                      <Button variant="solid" className="w-full" disabled>
                        Clear Logs
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Remove all logs older than 30 days</p>
                    </div>
                    
                    <div>
                      <Button variant="solid" className="w-full" disabled>
                        Optimize Database
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Run SQLite VACUUM to optimize the database</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Right Column - Logs */}
          <div className="lg:col-span-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">System Monitoring</h2>
              
              <div className="bg-card rounded-md">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium">System Logs</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {logs?.total || 0} total logs
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Log filters */}
                <div className="p-4 border-b">
                  <form onSubmit={applyLogFilters} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Log Level</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded"
                        value={logsFilters.level}
                        onChange={(e) => setLogsFilters({...logsFilters, level: e.target.value})}
                      >
                        <option value="">All Levels</option>
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Search</label>
                      <Input
                        type="text"
                        value={logsFilters.search}
                        onChange={(e) => setLogsFilters({...logsFilters, search: e.target.value})}
                        placeholder="Search logs..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date From</label>
                      <Input
                        type="date"
                        value={logsFilters.date_from}
                        onChange={(e) => setLogsFilters({...logsFilters, date_from: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date To</label>
                      <Input
                        type="date"
                        value={logsFilters.date_to}
                        onChange={(e) => setLogsFilters({...logsFilters, date_to: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2 flex space-x-2">
                      <Button type="submit" variant="solid">Apply Filters</Button>
                      <Button type="button" variant="ghost" onClick={resetLogFilters}>Reset</Button>
                    </div>
                  </form>
                </div>
                
                {/* Logs table */}
                <div className="p-4 max-h-[500px] overflow-auto">
                  {logsLoading ? (
                    <div className="flex justify-center py-12">
                      <span className="loading">Loading logs...</span>
                    </div>
                  ) : logs?.logs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg text-muted-foreground">No logs found matching your criteria.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs?.logs.map((log) => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${getLogLevelColor(log.level)}`}>
                              {log.level}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </div>
                          </div>
                          <div className="mt-2 text-sm">{log.message}</div>
                          {log.source && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Source: {log.source}
                            </div>
                          )}
                          {log.details && (
                            <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
                              {log.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Logs pagination */}
                {logs && logs.total_pages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <div className="flex space-x-1">
                      {Array.from({ length: logs.total_pages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setLogsPage(page)}
                          className={`px-3 py-1 rounded ${
                            logsPage === page
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card hover:bg-muted'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Errors section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Error Notifications</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-resolved"
                      checked={includeResolved}
                      onChange={(e) => setIncludeResolved(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="include-resolved" className="text-sm">
                      Show Resolved
                    </label>
                  </div>
                </div>
                
                {errorsLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="loading">Loading errors...</span>
                  </div>
                ) : errors?.errors.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded">
                    <p className="text-muted-foreground">No error notifications found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {errors?.errors.map((error) => (
                      <div 
                        key={error.id} 
                        className={`p-4 rounded border ${getErrorSeverityColor(error.severity)} ${error.resolved ? 'opacity-60' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{error.message}</div>
                          <div className="text-xs">{formatDate(error.timestamp)}</div>
                        </div>
                        {error.details && (
                          <div className="mt-2 text-sm">
                            {error.details}
                          </div>
                        )}
                        <div className="mt-3 flex justify-end">
                          {!error.resolved && (
                            <Button 
                              variant="light" 
                              size="sm"
                              disabled
                            >
                              Mark Resolved
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Admin; 
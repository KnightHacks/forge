"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

export default function EmailTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("test@example.com");
  const [testSubject, setTestSubject] = useState("Test Email");
  const [_testBody, _setTestBody] = useState("<h1>Hello World!</h1><p>This is a test email.</p>");
  const [testPriority, setTestPriority] = useState<"now" | "high" | "standard" | "low">("standard");
  const [batchEmails, setBatchEmails] = useState("user1@example.com,user2@example.com,user3@example.com");

  // Queries - using any for now until types are regenerated
  const queueStatus = (api as any).emailQueue?.getQueueStatus?.useQuery?.() || { data: null, isLoading: false };
  const queuedEmails = (api as any).emailQueue?.getQueuedEmails?.useQuery?.({ page: 1, pageSize: 10 }) || { data: null, isLoading: false };
  const emailConfig = (api as any).emailQueue?.getEmailConfig?.useQuery?.() || { data: null, isLoading: false };

  // Mutations - using any for now until types are regenerated
  const sendTestEmail = api.email.testEmail.useMutation({
    onSuccess: (data: any) => {
      setResult(`✅ Test email sent successfully! Job ID: ${data.jobId}`);
      setIsLoading(false);
    },
    onError: (error: any) => {
      setResult(`❌ Error: ${error.message}`);
      setIsLoading(false);
    },
  });

  const queueEmail = (api as any).emailQueue?.queueEmail?.useMutation?.({
    onSuccess: (data: any) => {
      setResult(`✅ Email queued successfully! ID: ${data.emailId}`);
      setIsLoading(false);
      queueStatus.refetch?.();
      queuedEmails.refetch?.();
    },
    onError: (error: any) => {
      setResult(`❌ Error: ${error.message}`);
      setIsLoading(false);
    },
  }) || { mutate: () => setResult("❌ Email queue not available") };

  const queueBatchEmail = (api as any).emailQueue?.queueBatchEmail?.useMutation?.({
    onSuccess: (data: any) => {
      setResult(`✅ Batch email queued successfully! Batch ID: ${data.batchId}, Count: ${data.count}`);
      setIsLoading(false);
      queueStatus.refetch?.();
      queuedEmails.refetch?.();
    },
    onError: (error: any) => {
      setResult(`❌ Error: ${error.message}`);
      setIsLoading(false);
    },
  }) || { mutate: () => setResult("❌ Email queue not available") };

  const updateConfig = (api as any).emailQueue?.updateEmailConfig?.useMutation?.({
    onSuccess: () => {
      setResult(`✅ Email configuration updated successfully!`);
      setIsLoading(false);
      emailConfig.refetch?.();
    },
    onError: (error: any) => {
      setResult(`❌ Error: ${error.message}`);
      setIsLoading(false);
    },
  }) || { mutate: () => setResult("❌ Email queue not available") };

  const handleSendTestEmail = () => {
    setIsLoading(true);
    setResult(null);
    sendTestEmail.mutate({ to: testEmail });
  };

  const handleQueueEmail = () => {
    setIsLoading(true);
    setResult(null);
    queueEmail.mutate({
      to: testEmail,
      subject: testSubject,
      html: _testBody,
      priority: testPriority,
    });
  };

  const handleQueueBatchEmail = () => {
    setIsLoading(true);
    setResult(null);
    const recipients = batchEmails.split(',').map(email => email.trim()).filter(email => email);
    queueBatchEmail.mutate({
      recipients,
      subject: testSubject,
      html: _testBody,
      priority: testPriority,
    });
  };

  const handleUpdateConfig = () => {
    setIsLoading(true);
    setResult(null);
    updateConfig.mutate({
      dailyLimit: 50,
      cronSchedule: "*/2 * * * *", // Every 2 minutes for testing
      enabled: true,
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">📧 Email Queue Test Dashboard</h1>
      
      {/* Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200">Queue Length</h3>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {queueStatus.data?.queueLength ?? "Loading..."}
          </p>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200">Daily Count</h3>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {queueStatus.data?.dailyCount ?? "Loading..."}/{queueStatus.data?.dailyLimit ?? "Loading..."}
          </p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Remaining</h3>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
            {queueStatus.data?.remainingCapacity ?? "Loading..."}
          </p>
        </div>
        <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200">Status</h3>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {queueStatus.data?.isEnabled ? "✅ Enabled" : "❌ Disabled"}
          </p>
        </div>
      </div>

      {/* Test Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Direct Email Test */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">🚀 Direct Email Test</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="test@example.com"
              />
            </div>
        <button
          onClick={handleSendTestEmail}
          disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Sending..." : "Send Direct Email"}
            </button>
          </div>
        </div>

        {/* Queue Single Email */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">📬 Queue Single Email</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Test Subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={testPriority}
                onChange={(e) => setTestPriority(e.target.value as "now" | "high" | "standard" | "low")}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="now">Now (Highest)</option>
                <option value="high">High</option>
                <option value="standard">Standard</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button
              onClick={handleQueueEmail}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Queueing..." : "Queue Single Email"}
            </button>
          </div>
        </div>

        {/* Queue Batch Email */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">📦 Queue Batch Email</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recipients (comma-separated)</label>
              <textarea
                value={batchEmails}
                onChange={(e) => setBatchEmails(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows={3}
                placeholder="user1@example.com,user2@example.com,user3@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Batch Test Subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={testPriority}
                onChange={(e) => setTestPriority(e.target.value as "now" | "high" | "standard" | "low")}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="now">Now (Highest)</option>
                <option value="high">High</option>
                <option value="standard">Standard</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button
              onClick={handleQueueBatchEmail}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Queueing..." : "Queue Batch Email"}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">⚙️ Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current Config</label>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
                <p><strong>Daily Limit:</strong> {emailConfig.data?.dailyLimit ?? "Loading..."}</p>
                <p><strong>Cron Schedule:</strong> {emailConfig.data?.cronSchedule ?? "Loading..."}</p>
                <p><strong>Enabled:</strong> {emailConfig.data?.enabled ? "Yes" : "No"}</p>
              </div>
            </div>
            <button
              onClick={handleUpdateConfig}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Updating..." : "Update Config (Test Settings)"}
        </button>
          </div>
        </div>
      </div>
        
      {/* Results */}
        {result && (
        <div className="mt-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-sm">{result}</p>
        </div>
      )}

      {/* Queued Emails List */}
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">📋 Queued Emails</h2>
        {queuedEmails.isLoading ? (
          <p>Loading queued emails...</p>
        ) : queuedEmails.data?.emails.length === 0 ? (
          <p className="text-gray-500">No emails in queue</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">To</th>
                  <th className="text-left p-2">Subject</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {queuedEmails.data?.emails?.map((email: any) => (
                  <tr key={email.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{email.id.slice(0, 8)}...</td>
                    <td className="p-2">{email.to}</td>
                    <td className="p-2">{email.subject}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        email.priority === 'now' ? 'bg-red-100 text-red-800' :
                        email.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        email.priority === 'standard' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {email.priority}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        email.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        email.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        email.status === 'completed' ? 'bg-green-100 text-green-800' :
                        email.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {email.status}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{new Date(email.createdAt as string).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function EmailTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendTestEmail = api.email.testEmail.useMutation({
    onSuccess: (data: { messageId: string }) => {
      setResult(`✅ Email sent successfully! Message ID: ${data.messageId}`);
      setIsLoading(false);
    },
    onError: (error: { message: string }) => {
      setResult(`❌ Error: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSendTestEmail = () => {
    setIsLoading(true);
    setResult(null);
    
    sendTestEmail.mutate({
      to: "samborges@knighthacks.org",
    });
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Email Test Page</h1>
      
      <div className="max-w-md mx-auto">
        <button
          onClick={handleSendTestEmail}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {isLoading ? "Sending..." : "Send Test Email"}
        </button>
        
        {result && (
          <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-sm">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

export default function KevinRodriguezPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">Kevin Rodriguez</h1>
        <p className="text-lg mb-6">Dev Team Application</p>
        
        <div className="space-y-4">
          <p>Welcome to my dev team application page!</p>
          
          <Button>Click Me</Button>
        </div>
      </Card>
    </main>
  );
}

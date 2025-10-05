import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GraphPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Graf</h1>
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Her kommer grafen etter hvert.</p>
        </CardContent>
      </Card>
    </div>
  );
}

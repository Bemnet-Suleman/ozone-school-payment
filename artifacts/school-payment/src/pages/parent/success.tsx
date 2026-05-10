import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVerifyChapaPayment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ParentSuccess() {
  const [txRef, setTxRef] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("txRef");
    if (!ref) {
      setLocation("/parent");
    } else {
      setTxRef(ref);
    }
  }, [setLocation]);

  const { data, isLoading, isError, error } = useVerifyChapaPayment(txRef || "", {
    query: {
      enabled: !!txRef,
      retry: false
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 text-center border-t-primary">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {isLoading ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : isError ? (
              <XCircle className="h-16 w-16 text-destructive" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isLoading ? "Verifying Payment..." : isError ? "Payment Verification Failed" : "Payment Successful"}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Please wait while we confirm with Chapa." : isError ? (error?.data?.error || "An unknown error occurred.") : "Your payment has been successfully recorded."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data && (
            <div className="text-sm space-y-2 text-left bg-muted/50 p-4 rounded-md">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{data.amount} ETB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs">{data.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-medium">{data.studentName}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/parent">
            <Button disabled={isLoading}>Return to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

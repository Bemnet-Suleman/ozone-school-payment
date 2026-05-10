import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetStudent, useCreatePayment, useSubmitManualPayment, getGetStudentQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage,FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, CreditCard, Building } from "lucide-react";
import { Link } from "wouter";

const manualPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  transactionRef: z.string().min(1, "Transaction reference is required"),
  receiptImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ManualPaymentValues = z.infer<typeof manualPaymentSchema>;

export default function ParentPay() {
  const params = useParams();
  const studentId = parseInt(params.studentId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chapaAmount, setChapaAmount] = useState<string>("1000");

  const { data: student, isLoading: isStudentLoading } = useGetStudent(studentId, {
    query: {
      enabled: !!studentId,
      queryKey: getGetStudentQueryKey(studentId)
    }
  });

  const createPaymentMutation = useCreatePayment();
  const submitManualMutation = useSubmitManualPayment();

  const manualForm = useForm<ManualPaymentValues>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: {
      amount: 1000,
      transactionRef: "",
      receiptImageUrl: "",
    },
  });

  const handleChapaPay = () => {
    const amountNum = parseFloat(chapaAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid amount." });
      return;
    }

    createPaymentMutation.mutate(
      { data: { studentId, amount: amountNum } },
      {
        onSuccess: (data) => {
          // In a real integration, we'd window.location.href = data.checkoutUrl
          // For mockup, we redirect to success page simulating a return
          setLocation(`/parent/success?txRef=${data.txRef}`);
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to initiate payment" });
        }
      }
    );
  };

  const onManualSubmit = (values: ManualPaymentValues) => {
    submitManualMutation.mutate(
      {
        data: {
          studentId,
          amount: values.amount,
          transactionRef: values.transactionRef,
          receiptImageUrl: values.receiptImageUrl || undefined,
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Payment Submitted", description: "Your manual payment is pending cashier approval." });
          setLocation("/parent");
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Submission failed", description: err.data?.error || "Failed to submit manual payment." });
        }
      }
    );
  };

  if (isStudentLoading || !student) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/parent" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Pay Fees for {student.name}</h1>
          <p className="text-muted-foreground mt-1">Grade {student.grade} - Section {student.section}</p>
        </div>

        <Card>
          <Tabs defaultValue="chapa" className="w-full">
            <CardHeader className="border-b bg-muted/20">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chapa" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Chapa Online
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Building className="h-4 w-4" /> Bank Transfer
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              
              <TabsContent value="chapa" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Payment Amount (ETB)</label>
                    <Input 
                      type="number" 
                      value={chapaAmount} 
                      onChange={(e) => setChapaAmount(e.target.value)} 
                      min="1"
                    />
                  </div>
                  <Button 
                    onClick={handleChapaPay} 
                    className="w-full bg-[#00A859] hover:bg-[#008f4c] text-white"
                    disabled={createPaymentMutation.isPending}
                  >
                    {createPaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Pay with Chapa
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    You will be redirected to Chapa's secure checkout.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="manual">
                <Form {...manualForm}>
                  <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm mb-4">
                      Please transfer the funds to <strong>CBE A/C: 1000123456789</strong> and enter the reference number below.
                    </div>
                    
                    <FormField
                      control={manualForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid (ETB)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={manualForm.control}
                      name="transactionRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. FT2310... " {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualForm.control}
                      name="receiptImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Image URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">Link to an uploaded image of your deposit slip.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={submitManualMutation.isPending}>
                      {submitManualMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit for Review
                    </Button>
                  </form>
                </Form>
              </TabsContent>

            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

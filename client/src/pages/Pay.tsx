import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { useState } from "react";

export default function Pay() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["/api/payment-sessions", sessionId],
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1844A6]" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-[7px]">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment session not found</h2>
            <p className="text-gray-600 text-sm">
              This payment link may have expired or is invalid. Please contact the merchant for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amount = (session as any)?.amount ?? 0;
  const currency = (session as any)?.currency ?? "USD";
  const merchantName = (session as any)?.merchantName ?? "Merchant";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border border-gray-200 rounded-[7px] shadow-sm">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">Pay {merchantName}</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${(amount / 100).toFixed(2)} <span className="text-sm font-normal text-gray-500 uppercase">{currency}</span>
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsProcessing(true);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="card-number">Card number</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      className="pl-10 rounded-[7px]"
                      data-testid="input-pay-card-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiration</Label>
                    <Input
                      id="expiry"
                      placeholder="MM / YY"
                      className="mt-1 rounded-[7px]"
                      data-testid="input-pay-expiry"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      className="mt-1 rounded-[7px]"
                      data-testid="input-pay-cvc"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#1844A6] text-white rounded-[7px]"
                  disabled={isProcessing}
                  data-testid="button-pay-submit"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay $${(amount / 100).toFixed(2)}`
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                <Lock className="h-3 w-3" />
                <span>Secured by SwipesBlue</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

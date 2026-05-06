import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Confirmation() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const ref = params.get("ref");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-4xl font-medium text-foreground mb-2">Booking Confirmed</h1>
          <p className="text-muted-foreground text-lg font-light">We look forward to seeing you.</p>
        </div>

        <Card className="border-none shadow-md rounded-3xl bg-card overflow-hidden">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest font-medium">Your Reference Number</p>
            <div className="bg-secondary/50 rounded-2xl py-6 px-4 mb-6">
              <span className="text-3xl font-mono tracking-widest text-foreground font-semibold">{ref || "N/A"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please quote this reference number when you arrive at the salon.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="rounded-full px-8 font-serif text-lg h-12">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

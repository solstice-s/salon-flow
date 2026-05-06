import { Link, useLocation } from "wouter";
import { useListServices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

export default function Home() {
  const { data: services, isLoading } = useListServices();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-medium tracking-tight text-foreground">SalonFlow</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button asChild variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground font-serif text-lg">
              <Link href="/">Services</Link>
            </Button>
            <Button asChild className="font-serif text-lg rounded-full px-6">
              <Link href="/book">Book Appointment</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero.jpg" 
              alt="Salon Interior" 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
          </div>
          <div className="relative z-10 container max-w-6xl mx-auto px-4 py-32 sm:py-48 flex flex-col items-start">
            <h1 className="font-serif text-5xl sm:text-7xl font-medium tracking-tight text-foreground max-w-2xl leading-tight">
              Elevate Your <br/><span className="text-primary italic">Beauty</span> Experience.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl font-light leading-relaxed">
              Discover a sanctuary of elegance and expertise. Book your personalized salon service today.
            </p>
            <Button asChild size="lg" className="mt-10 font-serif text-xl rounded-full px-8 h-14">
              <Link href="/book">Book Now</Link>
            </Button>
          </div>
        </section>

        <section className="container max-w-6xl mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-foreground mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light">
              Tailored treatments designed to enhance your natural beauty.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-none shadow-sm rounded-2xl">
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No services available at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services?.map((service) => (
                <Card key={service.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group bg-card">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="font-serif text-2xl font-medium">{service.name}</CardTitle>
                      <span className="font-medium text-lg text-primary">{service.price} SAR</span>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-sm mt-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {service.durationMinutes} mins
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                      {service.description || "Experience our premium " + service.name.toLowerCase() + " service tailored just for you."}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-6 px-6">
                    <Button 
                      variant="outline" 
                      className="w-full rounded-full font-serif text-base border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setLocation(`/book?serviceId=${service.id}`)}
                    >
                      Book this service
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="border-t border-border/40 bg-card py-12">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <span className="font-serif text-2xl font-medium tracking-tight text-foreground block mb-4">SalonFlow</span>
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} SalonFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

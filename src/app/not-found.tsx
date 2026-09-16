"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="farm-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-4xl">404</CardTitle>
          <CardDescription className="text-base">This page is not on the Field OS map.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Route: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pathname}</code>
        </CardContent>
        <CardFooter className="justify-center">
          <Button className="gold-gradient text-primary-foreground hover:brightness-105" asChild>
            <Link href="/">Return home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

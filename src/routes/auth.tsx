import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Nexus Student Command Center" },
      {
        name: "description",
        content: "Sign in or create your Nexus account to plan tasks, study, and track internships.",
      },
      { property: "og:title", content: "Sign in — Nexus Student Command Center" },
      {
        property: "og:description",
        content: "Sign in or create your Nexus account to plan tasks, study, and track internships.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setSent(true);
    toast.success("Check your email to confirm your account.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <GraduationCap className="h-6 w-6 text-primary" />
          Nexus
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Your student command center</CardTitle>
            <CardDescription>Sign in or create an account to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                account, then sign in.
              </p>
            ) : (
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email2">Email</Label>
                      <Input
                        id="email2"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password2">Password</Label>
                      <Input
                        id="password2"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account…" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

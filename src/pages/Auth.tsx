import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plane } from "lucide-react";

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back, pilot!"); nav("/"); }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: username || `pilot_${Math.random().toString(36).slice(2, 8)}` },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created! You got 1000 free coins 🎉"); nav("/"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-jet shadow-glow mb-3">
            <Plane className="w-9 h-9 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-black text-gradient-jet glow-text">JetX</h1>
          <p className="text-muted-foreground text-sm mt-1">Cash out before the jet flies away</p>
        </div>
        <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-11 font-bold shadow-glow">Take Off</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <div><Label>Pilot name</Label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ace_pilot" /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-11 font-bold shadow-glow">Create Account · Get 1000 coins</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;

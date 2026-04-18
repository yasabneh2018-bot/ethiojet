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

// Convert phone to a synthetic email so we can use email/password auth
// without sending OTP/SMS or email confirmation. Play-money demo only.
const phoneToEmail = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@jetx.player`;
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits;
};

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (!norm) { toast.error("Enter a valid phone number"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(norm), password,
    });
    setBusy(false);
    if (error) toast.error("Invalid phone or password");
    else { toast.success("Welcome back, pilot!"); nav("/"); }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (!norm) { toast.error("Enter a valid phone number"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const uname = username.trim() || `pilot_${norm.slice(-4)}`;
    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(norm),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: uname, phone: norm },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message.includes("registered") ? "Phone already registered" : error.message);
      return;
    }
    // Auto-confirm is on, but session may need a sign-in if confirm flow returned without session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await supabase.auth.signInWithPassword({ email: phoneToEmail(norm), password });
    }
    setBusy(false);
    toast.success("Account created! 1000 free coins 🎉");
    nav("/");
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
                <div>
                  <Label>Phone number</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. +254 712 345 678"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-11 font-bold shadow-glow">
                  Take Off
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <div>
                  <Label>Pilot name</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ace_pilot" />
                </div>
                <div>
                  <Label>Phone number</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. +254 712 345 678"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-11 font-bold shadow-glow">
                  Create Account · Get 1000 coins
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Play-money demo · No SMS or email verification
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plane } from "lucide-react";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const doSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = signIn(phone, password);
    setBusy(false);
    if (error) toast.error(error);
    else { toast.success("Welcome back, pilot!"); nav("/"); }
  };

  const doSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = signUp(phone, password, username);
    setBusy(false);
    if (error) toast.error(error);
    else { toast.success("Account created! 1000 free coins 🎉"); nav("/"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-jet shadow-glow mb-3">
            <Plane className="w-9 h-9 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-black text-gradient-jet glow-text">Aviator</h1>
          <p className="text-muted-foreground text-sm mt-1">Cash out before the jet flies away</p>
        </div>
        <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={doSignIn} className="space-y-3">
                <div>
                  <Label>Phone number</Label>
                  <Input type="tel" inputMode="tel" placeholder="e.g. 0941815119" required
                    value={phone} onChange={e => setPhone(e.target.value)} />
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
              <form onSubmit={doSignUp} className="space-y-3">
                <div>
                  <Label>Pilot name</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ace_pilot" />
                </div>
                <div>
                  <Label>Phone number</Label>
                  <Input type="tel" inputMode="tel" placeholder="e.g. 0912345678" required
                    value={phone} onChange={e => setPhone(e.target.value)} />
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
            Offline play-money demo · data is stored on this device only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

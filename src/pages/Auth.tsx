import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, X } from "lucide-react";

type Mode = "login" | "register";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "login" ? signIn(phone, password) : signUp(phone, password, username);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success(mode === "login" ? "Welcome back, pilot!" : "Account created! 1000 free coins");
    nav("/");
  };

  return (
    <div className="min-h-screen bg-[hsl(225_18%_14%)] flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
        <h1 className="text-lg tracking-wide text-white uppercase">{mode}</h1>
        <button aria-label="Close" onClick={() => nav("/")} className="text-white/80">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Promo banner */}
        <div className="rounded-xl overflow-hidden h-28 flex items-center justify-center bg-gradient-to-r from-[hsl(265_80%_35%)] via-[hsl(300_70%_35%)] to-[hsl(200_90%_40%)]">
          <div className="text-center">
            <div className="text-2xl font-black text-white tracking-wide">SQUAD BET</div>
            <div className="text-sm font-bold text-white/90">JOIN TO OUR BOT TO GET FREE WHEELS</div>
          </div>
        </div>

        {/* Card */}
        <form onSubmit={submit} className="rounded-2xl bg-[hsl(228_16%_22%)] p-5 flex flex-col min-h-[60vh]">
          {mode === "register" && (
            <div className="mb-5">
              <label className="block text-sm text-white/80 mb-2">Username *</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ace_pilot"
                className="h-14 rounded-lg bg-[hsl(228_16%_17%)] border-0 text-white text-base"
              />
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm text-white/80 mb-2">Mobile Number *</label>
            <div className="flex items-center h-14 rounded-lg bg-[hsl(228_16%_17%)] overflow-hidden">
              <div className="flex items-center gap-2 px-3 shrink-0">
                <span className="w-7 h-7 rounded-full bg-gradient-to-b from-green-500 via-yellow-400 to-red-500 border border-white/20" />
                <span className="text-white text-base">+251</span>
              </div>
              <div className="w-px h-7 bg-white/15" />
              <Input
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0941815119"
                className="flex-1 h-14 bg-transparent border-0 text-white text-base focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Password *</label>
            <div className="flex items-center h-14 rounded-lg bg-[hsl(228_16%_17%)] overflow-hidden">
              <Input
                type={show ? "text" : "password"}
                required
                minLength={mode === "register" ? 6 : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="flex-1 h-14 bg-transparent border-0 text-white text-base focus-visible:ring-0"
              />
              <button type="button" onClick={() => setShow(s => !s)} aria-label="Toggle password" className="px-4 text-white/70">
                {show ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="mt-auto pt-10 space-y-4">
            <button
              disabled={busy}
              className="w-full h-14 rounded-lg bg-[hsl(140_60%_45%)] hover:bg-[hsl(140_60%_50%)] text-white text-lg font-medium disabled:opacity-60"
            >
              {mode === "login" ? "Login" : "Register"}
            </button>
            {mode === "login" ? (
              <>
                <div className="text-center">
                  <span className="text-[hsl(140_60%_50%)] underline text-base">Forgot your password?</span>
                </div>
                <p className="text-center text-white/85">
                  Don't have an account yet?{" "}
                  <button type="button" onClick={() => setMode("register")} className="text-[hsl(140_60%_50%)] font-bold">
                    Register
                  </button>
                </p>
              </>
            ) : (
              <p className="text-center text-white/85">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-[hsl(140_60%_50%)] font-bold">
                  Login
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;

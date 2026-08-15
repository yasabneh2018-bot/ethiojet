import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { topProfiles, subscribeDb } from "@/lib/localDb";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { Input } from "@/components/ui/input";
import {
  ArrowDownToLine, ArrowUpFromLine, Trophy, Search, SlidersHorizontal,
  Home as HomeIcon, Volleyball, Gamepad2, Flame, Timer,
} from "lucide-react";
import aviatorLogo from "@/assets/aviator-logo.png";

interface TopGamer {
  username: string;
  total_wagered: number;
}

const GAME_TABS = ["ALL GAMES", "MY GAMES"] as const;
const PERIODS = ["MONTHLY", "DAILY", "MY"] as const;
const CATEGORIES = ["All", "Most Popular", "Favourites", "Keno", "Card Games", "Crash"];

const Home = () => {
  const { profile } = useProfile();
  const [top, setTop] = useState<TopGamer[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [tab, setTab] = useState<(typeof GAME_TABS)[number]>("ALL GAMES");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("MONTHLY");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    const i = setInterval(() => setCountdown(c => (c <= 1 ? 5 : c - 1)), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const load = () => setTop(topProfiles(5));
    load();
    return subscribeDb(load);
  }, []);

  if (!profile) return null;
  const balanceBirr = coinsToBirr(profile.balance);

  return (
    <div className="-mx-2 sm:-mx-4 -my-3 pb-20 bg-[hsl(220_30%_10%)] min-h-screen">
      {/* Cashback strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <span className="w-10 h-10 rounded-full bg-[hsl(220_25%_16%)] flex items-center justify-center">
          <Flame className="w-5 h-5 text-[hsl(140_60%_50%)]" />
        </span>
        <span className="text-white text-base">5% daily cashback</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-white/60">
          <Timer className="w-3.5 h-3.5" /> next round {countdown}s
        </span>
      </div>

      {/* Game tabs */}
      <div className="grid grid-cols-2">
        {GAME_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-4 text-base font-semibold tracking-wide border-b-2 ${
              tab === t
                ? "text-[hsl(140_60%_50%)] border-[hsl(140_60%_50%)] bg-[hsl(220_28%_13%)]"
                : "text-white border-transparent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Hero banner */}
      <Link to="/play" className="block relative h-56 overflow-hidden bg-gradient-to-br from-[hsl(0_70%_18%)] via-[hsl(0_60%_10%)] to-black">
        <img src={aviatorLogo} alt="Aviator crash game" className="absolute inset-0 m-auto h-40 object-contain drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]" />
        <span className="absolute bottom-2 right-3 text-xs text-white/70 tabular-nums">00:0{countdown}</span>
      </Link>

      {/* Wallet */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[hsl(220_25%_16%)] p-3">
          <div className="text-[10px] uppercase tracking-widest text-white/50">Balance</div>
          <div className="text-xl font-black tabular-nums text-[hsl(140_60%_50%)]">{fmtBirr(balanceBirr)}</div>
        </div>
        <div className="rounded-xl bg-[hsl(220_25%_16%)] p-3">
          <div className="text-[10px] uppercase tracking-widest text-white/50">Withdrawable</div>
          <div className="text-xl font-black tabular-nums text-white">{fmtBirr(balanceBirr)}</div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="grid grid-cols-3">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`py-3 text-sm font-semibold ${
              period === p ? "text-[hsl(140_60%_50%)] bg-[hsl(220_28%_13%)] rounded-t-xl" : "text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Top winners */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> Top Winners
        </div>
        {top.length === 0 ? (
          <div className="text-sm text-white/50 py-3">No rankings yet — be the first!</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {top.map((g, i) => (
              <div key={i} className="shrink-0 w-64 flex items-center gap-3 rounded-xl bg-[hsl(220_25%_16%)] p-3">
                <img src={aviatorLogo} alt="" className="w-16 h-16 rounded-lg object-contain bg-black/40 p-1" />
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">{g.username}</div>
                  <div className="text-[hsl(140_60%_50%)] font-black tabular-nums">
                    {fmtBirr(coinsToBirr(Number(g.total_wagered)))}
                  </div>
                  <div className="text-xs text-white/45">wagered</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="flex gap-5 px-4 py-2 overflow-x-auto no-scrollbar border-t border-white/5">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 text-base font-semibold ${cat === c ? "text-[hsl(140_60%_50%)]" : "text-white"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 flex items-center gap-2 h-12 rounded-lg bg-[hsl(220_25%_16%)] px-3">
          <Search className="w-5 h-5 text-white/60" />
          <Input placeholder="Search" className="border-0 bg-transparent text-white h-10 focus-visible:ring-0" />
        </div>
        <button className="w-12 h-12 rounded-full bg-[hsl(220_25%_16%)] flex items-center justify-center text-white" aria-label="Filters">
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-[hsl(220_28%_13%)] border-t border-white/10">
        {[
          { to: "/", label: "Home", icon: HomeIcon },
          { to: "/wagering", label: "Sports", icon: Volleyball },
          { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
          { to: "/play", label: "GAMES", icon: Gamepad2, active: true },
          { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
        ].map(i => (
          <Link key={i.label} to={i.to} className={`py-2 flex flex-col items-center gap-1 text-[11px] ${i.active ? "text-[hsl(140_60%_50%)]" : "text-white"}`}>
            <i.icon className="w-6 h-6" />
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Home;

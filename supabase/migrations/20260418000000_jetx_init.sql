-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 1000,
  total_wagered NUMERIC(14,2) NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Bets / round history
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  cashout_multiplier NUMERIC(8,2),
  crash_multiplier NUMERIC(8,2) NOT NULL,
  payout NUMERIC(14,2) NOT NULL DEFAULT 0,
  won BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions (deposit/withdraw virtual)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdraw')),
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tx" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tx" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tournament scores (per user, per tournament window)
CREATE TABLE public.tournament_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_key TEXT NOT NULL,
  profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tournament_key)
);
ALTER TABLE public.tournament_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tournament scores" ON public.tournament_scores FOR SELECT USING (true);
CREATE POLICY "Users insert own scores" ON public.tournament_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own scores" ON public.tournament_scores FOR UPDATE USING (auth.uid() = user_id);

-- Auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'pilot_' || substr(NEW.id::text,1,6))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

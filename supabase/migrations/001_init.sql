-- דופמין — Supabase Schema Migration
-- Run this in Supabase SQL Editor after creating the project

-- 1. SUBSCRIBERS TABLE (core user data)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  topics TEXT[] DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'annual')),
  stripe_customer_id TEXT DEFAULT '',
  stripe_subscription_id TEXT DEFAULT '',
  articles_this_week INTEGER DEFAULT 0,
  max_articles_per_week INTEGER DEFAULT 3,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  referrer_id UUID REFERENCES subscribers(id),
  referral_code TEXT UNIQUE DEFAULT '',
  referral_count INTEGER DEFAULT 0,
  last_newsletter_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- 2. ARTICLES TABLE (curated + RSS articles cache)
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  source TEXT,
  topic TEXT,
  topic_he TEXT,
  subtopic TEXT,
  image TEXT,
  author TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_curated BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VERIFIED LINKS TABLE (curated knowledge sources)
CREATE TABLE IF NOT EXISTS verified_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  category TEXT DEFAULT 'journalism',
  lang TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NEWSLETTER HISTORIES
CREATE TABLE IF NOT EXISTS newsletter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  article_count INTEGER DEFAULT 0,
  recipient_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed'))
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES subscribers(id),
  stripe_payment_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'ils',
  status TEXT DEFAULT 'succeeded' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  tier TEXT DEFAULT 'premium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES subscribers(id),
  referred_email TEXT NOT NULL,
  referred_id UUID REFERENCES subscribers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_tier ON subscribers(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published);
CREATE INDEX IF NOT EXISTS idx_verified_links_topic ON verified_links(topic);
CREATE INDEX IF NOT EXISTS idx_payments_subscriber ON payments(subscriber_id);

-- Enable Row Level Security (RLS)
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_links ENABLE ROW LEVEL SECURITY;

-- RLS: Anon can read articles and verified_links
CREATE POLICY "Anyone can read articles" ON articles FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can read verified links" ON verified_links FOR SELECT USING (is_active = true);

-- RLS: Subscribers can read/write their own data
CREATE POLICY "Subscribers read own" ON subscribers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Subscribers update own" ON subscribers FOR UPDATE USING (auth.uid() = id);

-- Functions
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := upper(substr(md5(random()::text), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code BEFORE INSERT ON subscribers
FOR EACH ROW WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
EXECUTE FUNCTION generate_referral_code();

-- Create a subscriber record when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscribers (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create subscriber on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- Migration 006: Add legal + customer contact fields to companies
-- Run in Supabase SQL Editor

ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_business_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_address       TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_email      TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_address    TEXT;

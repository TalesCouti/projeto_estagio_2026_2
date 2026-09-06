CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    CREATE TYPE appointment_type AS ENUM ('clinica_geral', 'cardiologia', 'psicologia');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('pendente', 'confirmado', 'cancelado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(120) NOT NULL,
  email varchar(180) NOT NULL,
  tipo appointment_type NOT NULL,
  data date NOT NULL,
  horario time NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_unique_active_slot
  ON appointments (tipo, data, horario)
  WHERE status IN ('pendente', 'confirmado');

CREATE INDEX IF NOT EXISTS appointments_date_status_idx
  ON appointments (data, horario, status);

CREATE TABLE IF NOT EXISTS holidays (
  data date PRIMARY KEY,
  nome varchar(180) NOT NULL,
  tipo varchar(40) NOT NULL DEFAULT 'NACIONAL',
  fonte text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS holidays_date_idx ON holidays (data);

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(180) NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

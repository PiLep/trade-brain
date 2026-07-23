# Auth Trade Brain (Better Auth)

Auth **self-hosted** (pas de Clerk) : code email OTP + passkey, **invitation only**.

Invitee initiale : `pierrelepetit91@gmail.com`.

## Variables d’environnement

```env
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=https://ton-domaine.app
NEXT_PUBLIC_APP_URL=https://ton-domaine.app
AUTH_ALLOWED_EMAILS=pierrelepetit91@gmail.com
PASSKEY_RP_ID=ton-domaine.app   # hostname sans https://

# Email OTP (prod)
RESEND_API_KEY=re_...
EMAIL_FROM=Trade Brain <auth@ton-domaine.app>
```

Sans `RESEND_API_KEY`, le code OTP est loggé dans la console serveur (dev).

## Première mise en place

```bash
# 1. Secret
openssl rand -base64 32   # → BETTER_AUTH_SECRET

# 2. Tables Better Auth (user, session, passkey…)
npx auth@latest migrate --yes

# 3. Inviter Pierre (table auth_invite)
npm run invite
```

## Connexion

1. `/sign-in` → email invité → code à 6 chiffres
2. Menu compte (initiale) → **Ajouter une passkey**
3. Ensuite : bouton « Continuer avec une passkey »

## Inviter quelqu’un d’autre

1. `npm run invite -- autre@email.com` (sur la machine / volume qui tient `data/`)
2. Ajouter l’email à `AUTH_ALLOWED_EMAILS` et redéployer

## Notes déploiement

- SQLite vit dans `data/` (déjà gitignoré). Il faut un **disque persistant** (VPS, volume) — pas un filesystem éphémère type serverless pur.
- `PASSKEY_RP_ID` doit matcher le hostname de prod (ex. `app.example.com`).

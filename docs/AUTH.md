# Auth Trade Brain (Better Auth)

Auth **self-hosted** (pas de Clerk) : code email OTP + passkey, **invitation only**, **multi-tenant** (espaces / organizations).

Invitee initiale : `pierrelepetit91@gmail.com`.

## Variables d’environnement

```env
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=https://ton-domaine.app
NEXT_PUBLIC_APP_URL=https://ton-domaine.app
AUTH_ALLOWED_EMAILS=pierrelepetit91@gmail.com
PASSKEY_RP_ID=ton-domaine.app   # hostname sans https://

# Email OTP / invitations d’espace (prod)
RESEND_API_KEY=re_...
EMAIL_FROM=Trade Brain <auth@ton-domaine.app>
```

Sans `RESEND_API_KEY`, les e-mails (OTP + invitations d’espace) sont loggés dans la console serveur (dev).

## Première mise en place

```bash
# 1. Secret
openssl rand -base64 32   # → BETTER_AUTH_SECRET

# 2. Tables Better Auth (user, session, passkey, organization…)
npm run auth:migrate

# 3. Inviter Pierre (table auth_invite)
npm run invite
```

## Connexion

1. `/sign-in` → email invité → code à 6 chiffres
2. Menu compte (initiale) → **Ajouter une passkey**
3. Ensuite : bouton « Continuer avec une passkey »

À la première connexion, un **espace personnel** est créé automatiquement et devient l’espace actif.

## Multi-tenant (espaces)

- Chaque espace isole portefeuille (localStorage scoped), plans DCA et journal SQLite.
- Sélecteur d’espace dans le header + page `/tenants` pour créer, inviter, retirer.
- Invitation d’espace : e-mail avec lien `/accept-invitation/:id` (ajoute aussi l’email à `auth_invite` pour le gate invite-only).
- Rôles Better Auth : `owner` / `admin` / `member`.

## Inviter quelqu’un d’autre (accès app)

Deux options :

1. **Depuis l’UI** : `/tenants` → Inviter (recommandé — débloque aussi la connexion)
2. **CLI** : `npm run invite -- autre@email.com` puis ajouter l’email à `AUTH_ALLOWED_EMAILS` au redéploiement

## Notes déploiement

- SQLite vit dans `data/` (déjà gitignoré). Il faut un **disque persistant** (VPS, volume) — pas un filesystem éphémère type serverless pur.
- `PASSKEY_RP_ID` doit matcher le hostname de prod (ex. `app.example.com`).
- Après mise à jour multi-tenant : `npm run auth:migrate` sur le volume qui tient `data/`.
- Auth et le reste de l’app partagent **une seule** connexion SQLite (`getDb()`). Ne pas ouvrir un second `better-sqlite3` sur le même fichier.
- OTP email : `resendStrategy: "reuse"` (même code si renvoi pendant la validité) + index unique partiel sur `verification.identifier` pour les OTP, afin d’éviter les faux « Code invalide ».

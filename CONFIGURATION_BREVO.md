# Guide de configuration Brevo (ex-Sendinblue) pour Constance Cellier

## 📧 Pourquoi Brevo ?

- ✅ **Service français** avec support en français
- ✅ **Gratuit** jusqu'à 300 emails/jour (plus que suffisant pour démarrer)
- ✅ **Simple à configurer** en quelques minutes
- ✅ **Très fiable** avec une excellente délivrabilité
- ✅ **Analytics** pour suivre l'envoi des emails

## 🚀 Configuration étape par étape

### Étape 1: Créer un compte Brevo

1. Allez sur https://www.brevo.com
2. Cliquez sur "S'inscrire" (ou "Sign up" en anglais)
3. Remplissez le formulaire avec:
   - Email: `cellierconstance@gmail.com` (ou votre email)
   - Mot de passe: (créez un mot de passe sécurisé)
   - Nom et prénom
4. Confirmez votre email via le lien reçu

### Étape 2: Générer une clé SMTP

1. **Connectez-vous** à votre compte Brevo
2. Allez dans le menu: **Paramètres** (Settings) → **SMTP et API** → **SMTP**
   - Ou directement: https://app.brevo.com/settings/keys/api
3. Dans la section **"Clés SMTP"** (SMTP Keys), cliquez sur **"Générer une nouvelle clé SMTP"** (Generate a new SMTP key)
4. Donnez un nom à votre clé, par exemple: `Constance Cellier Production`
5. Cliquez sur **"Générer"**
6. ⚠️ **IMPORTANT**: Copiez immédiatement la clé qui s'affiche, car elle ne sera plus visible après !
   - Elle ressemble à: `xkeysib-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXX`

### Étape 3: Configurer dans votre fichier `.env`

Ouvrez votre fichier `.env` et remplissez ces lignes:

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=cellierconstance@gmail.com
SMTP_PASSWORD=xkeysib-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXX
SMTP_FROM=noreply@constance-cellier.fr
```

**Explications:**
- `SMTP_HOST`: Toujours `smtp-relay.brevo.com`
- `SMTP_PORT`: Toujours `587`
- `SMTP_USER`: L'email avec lequel vous vous êtes inscrit sur Brevo
- `SMTP_PASSWORD`: La clé SMTP que vous venez de générer (commence par `xkeysib-`)
- `SMTP_FROM`: L'email qui apparaîtra comme expéditeur (peut être différent de `SMTP_USER`)

### Étape 4: Vérifier la configuration

1. Redémarrez vos conteneurs Docker:
   ```bash
   docker compose restart api
   ```

2. Testez l'envoi d'un email:
   - Connectez-vous en admin
   - Créez une boutique de test
   - Vérifiez que l'email de bienvenue arrive bien

## 📊 Vérifier les emails envoyés

Dans votre compte Brevo:
- Allez dans **Campagnes** → **Emails transactionnels** pour voir tous les emails envoyés
- Vous pouvez voir le statut de chaque email (envoyé, livré, ouvert, etc.)

## 🔒 Sécurité

- **Ne partagez JAMAIS** votre clé SMTP
- **Ne commitez JAMAIS** votre fichier `.env` dans Git (il est déjà dans `.gitignore`)
- Si vous perdez votre clé, vous pouvez la régénérer dans Brevo

## ❓ Problèmes courants

### "Erreur d'authentification SMTP"
- Vérifiez que votre clé SMTP est correctement copiée (sans espaces avant/après)
- Vérifiez que vous utilisez le bon `SMTP_USER` (l'email avec lequel vous vous êtes inscrit)

### "Email non reçu"
- Vérifiez vos spams/courriers indésirables
- Vérifiez dans Brevo que l'email a bien été envoyé (section "Emails transactionnels")
- Vérifiez que l'adresse email de destination est valide

### "Limite d'emails atteinte"
- Avec le plan gratuit, vous avez 300 emails/jour
- Vérifiez votre usage dans Brevo → Paramètres → Votre compte
- Si vous dépassez, passez à un plan payant (très abordable)

## 📞 Support

- Documentation Brevo: https://help.brevo.com/hc/fr
- Support Brevo: support@brevo.com (en français)

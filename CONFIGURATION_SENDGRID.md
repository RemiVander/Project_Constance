# Guide de configuration SendGrid pour Constance Cellier

## 📧 Pourquoi SendGrid ?

- ✅ **Service très fiable** utilisé par de nombreuses entreprises en production
- ✅ **Gratuit** jusqu'à 100 emails/jour (suffisant pour démarrer)
- ✅ **Simple à configurer** en quelques minutes
- ✅ **Excellent délivrabilité** - emails arrivent rarement en spam
- ✅ **Analytics détaillés** pour suivre l'envoi des emails
- ✅ **Documentation claire** et support réactif

## 🚀 Configuration étape par étape

### Étape 1: Créer un compte SendGrid

1. Allez sur https://signup.sendgrid.com
2. Remplissez le formulaire:
   - Email: `cellierconstance@gmail.com` (ou votre email)
   - Mot de passe: (créez un mot de passe sécurisé)
   - Nom et prénom
   - Nom de l'entreprise (optionnel): `Constance Cellier`
3. Acceptez les conditions d'utilisation
4. Cliquez sur "Create Account"
5. **Confirmez votre email** via le lien reçu dans votre boîte mail

### Étape 2: Vérifier votre compte (première connexion)

1. Après confirmation, vous serez redirigé vers un formulaire de vérification
2. Remplissez les informations demandées (peuvent être modifiées plus tard)
3. Pour "How will you send email?", sélectionnez "Mail API" ou "SMTP Relay"
4. Cliquez sur "Get Started"

**⚠️ IMPORTANT - Configuration de domaine :**
- SendGrid vous proposera peut-être de configurer un domaine personnalisé
- **VOUS POUVEZ IGNORER CETTE ÉTAPE** pour l'instant (cliquez sur "Skip" ou fermez)
- La configuration de domaine n'est **PAS nécessaire** pour utiliser SendGrid en SMTP
- Vous pouvez configurer votre domaine plus tard si vous le souhaitez (après l'achat chez OVH)
- Pour tester et démarrer, allez directement à l'Étape 3 (création de la clé API)

### Étape 3: Vérifier un expéditeur (Single Sender Verification) - RECOMMANDÉ

⚠️ **Cette étape est recommandée/obligatoire** pour éviter que vos emails soient bloqués.

1. **Connectez-vous** à votre compte SendGrid
2. Dans le menu de gauche, allez dans: **Settings** → **Sender Authentication**
3. Cliquez sur **"Verify a Single Sender"**
4. Remplissez le formulaire:
   - **From Email Address**: Mettez votre email (ex: `cellierconstance@gmail.com`)
   - **From Name**: `Constance Cellier` (ou le nom que vous voulez)
   - **Reply To**: Laissez le même email
   - **Company Address**: Votre adresse (optionnel pour tester)
5. Cliquez sur **"Create"**
6. **Vérifiez votre email** : SendGrid envoie un email de vérification
7. **Cliquez sur le lien** dans l'email reçu pour vérifier l'expéditeur
8. ✅ Une fois vérifié, vous pourrez utiliser cet email dans `SMTP_FROM`

**Note**: Pour tester rapidement, vous pouvez utiliser votre email Gmail. Pour la production avec votre propre domaine, vous ferez la "Domain Authentication" plus tard.

### Étape 4: Créer une clé API SMTP

1. **Connectez-vous** à votre compte SendGrid
2. Dans le menu de gauche, allez dans: **Settings** → **API Keys**
   - Ou directement: https://app.sendgrid.com/settings/api_keys
3. Cliquez sur le bouton **"Create API Key"** (en haut à droite)
4. **Nom de la clé**: Donnez un nom descriptif, par exemple:
   - `Constance Cellier Production`
   - `Production SMTP`
5. **Permissions**: Sélectionnez une des options:
   - ✅ **"Full Access"** (recommandé pour débuter, plus simple)
   - ✅ **"Restricted Access"** (plus sécurisé, sélectionnez au minimum "Mail Send")
6. Cliquez sur **"Create & View"**
7. ⚠️ **IMPORTANT**: Copiez immédiatement la clé API qui s'affiche!
   - Elle ressemble à: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Elle commence toujours par `SG.`
   - **Cette clé ne sera plus visible après!** Si vous la perdez, il faudra la recréer.

### Étape 5: Configurer dans votre fichier `.env`

Ouvrez votre fichier `.env` et remplissez ces lignes:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@constance-cellier.fr
```

**Explications:**
- `SMTP_HOST`: Toujours `smtp.sendgrid.net`
- `SMTP_PORT`: Toujours `587`
- `SMTP_USER`: **Toujours `apikey`** (littéralement, c'est une constante pour SendGrid)
- `SMTP_PASSWORD`: La clé API que vous venez de générer (commence par `SG.`)
- `SMTP_FROM`: L'email qui apparaîtra comme expéditeur (doit être un email vérifié dans SendGrid - celui que vous avez vérifié à l'étape 3, ex: `cellierconstance@gmail.com`)

### Étape 6: Vérifier la configuration

1. Redémarrez vos conteneurs Docker:
   ```bash
   docker compose restart api
   ```

2. Testez l'envoi d'un email:
   - Connectez-vous en admin
   - Créez une boutique de test
   - Vérifiez que l'email de bienvenue arrive bien

## 📊 Vérifier les emails envoyés

Dans votre compte SendGrid:
- Allez dans **Activity** (menu de gauche) pour voir tous les emails envoyés
- Vous pouvez voir le statut de chaque email (délivré, ouvert, cliqué, etc.)
- Les statistiques sont disponibles dans **Stats** pour une vue d'ensemble

## 🔒 Sécurité

- **Ne partagez JAMAIS** votre clé API
- **Ne commitez JAMAIS** votre fichier `.env` dans Git (il est déjà dans `.gitignore`)
- Si vous perdez votre clé, vous pouvez la supprimer et en créer une nouvelle dans SendGrid
- Pour plus de sécurité, utilisez "Restricted Access" avec uniquement les permissions "Mail Send"

## ❓ Problèmes courants

### "Erreur d'authentification SMTP" ou "535 Authentication failed"

**Causes possibles:**
- La clé API est incorrecte (vérifiez qu'elle commence bien par `SG.`)
- La clé API a été supprimée ou désactivée dans SendGrid
- Vous utilisez le mauvais `SMTP_USER` (doit être exactement `apikey`, pas votre email!)

**Solution:**
- Vérifiez que `SMTP_USER=apikey` (littéralement, sans guillemets)
- Vérifiez votre clé API dans SendGrid → Settings → API Keys
- Si nécessaire, créez une nouvelle clé API

### "The from address does not match a verified Sender Identity" (erreur 550)

**Cause:**
- L'adresse email dans `SMTP_FROM` n'est pas vérifiée dans SendGrid
- SendGrid refuse d'envoyer des emails depuis une adresse non vérifiée

**Solution:**
1. Dans SendGrid → Settings → Sender Authentication → Single Sender Verification
2. Vérifiez quels emails sont vérifiés (statut "Verified")
3. Utilisez **exactement** cet email vérifié dans `SMTP_FROM` de votre `.env`
4. Redémarrez l'API: `docker compose restart api`

**Exemple:** Si vous avez vérifié `cellierconstance@gmail.com`, alors:
```bash
SMTP_FROM=cellierconstance@gmail.com
```

**Pour voir les erreurs dans SendGrid:**
- Allez dans **Activity** (menu de gauche) pour voir tous les emails tentés
- Vous verrez le statut: "Dropped", "Bounced", ou "Processed"
- Cliquez sur un email pour voir les détails de l'erreur

### "Email non reçu" ou "Email en spam"

**Causes possibles:**
- ✅ **NORMAL au début** : Les emails peuvent aller en spam les premiers jours (réputation du compte SendGrid à construire)
- Vérifiez vos spams/courriers indésirables
- Vérifiez dans SendGrid → Activity que l'email a bien été envoyé
- Vérifiez que l'adresse email de destination est valide
- Vérifiez que vous n'avez pas atteint la limite (100 emails/jour en gratuit)

**Solution:**
- Dans SendGrid → Activity, vérifiez le statut de l'email
- Si "Processed" → l'email a été envoyé avec succès
- Si "Dropped" ou "Bounced" → vérifiez l'adresse email de destination

**Pour réduire les spams :**
1. ✅ **Marquez les emails comme "Non spam"** dans votre boîte mail (améliore la réputation)
2. ✅ **Ajoutez l'expéditeur à vos contacts** (ex: `cellierconstance@gmail.com`)
3. ⏳ **Avec le temps** : La réputation s'améliore en envoyant régulièrement des emails valides
4. 🔧 **À long terme** : Quand vous aurez votre propre domaine (ex: `constance-cellier.fr`), configurez SPF/DKIM/DMARC dans les DNS pour améliorer la délivrabilité

### "Limite d'emails atteinte"

- Avec le plan gratuit, vous avez 100 emails/jour
- Vérifiez votre usage dans SendGrid → Settings → Account Details
- Si vous dépassez régulièrement, passez à un plan payant (à partir de ~$15/mois pour 40 000 emails)

### "Erreur de connexion au serveur SMTP"

- Vérifiez que `SMTP_HOST=smtp.sendgrid.net` (sans fautes de frappe)
- Vérifiez que `SMTP_PORT=587` (pas 465 ou autre)
- Vérifiez votre connexion internet
- Vérifiez que votre firewall/autoroute ne bloque pas le port 587

## 💡 Astuces

- **Configuration de domaine (optionnelle, pour plus tard)**:
  - Si vous voulez utiliser votre propre domaine (ex: noreply@constance-cellier.fr):
    1. **D'abord**: Achetez votre domaine chez OVH
    2. **Ensuite**: Configurez les DNS de votre domaine (enregistrements SPF, DKIM dans SendGrid)
    3. **Puis**: Revenez dans SendGrid → Settings → Sender Authentication → Domain Authentication
  - Cette étape améliore la délivrabilité mais **n'est pas obligatoire** pour démarrer
  - Vous pouvez tester avec SendGrid maintenant et configurer le domaine plus tard

- **Webhooks**: SendGrid peut envoyer des notifications en temps réel sur les emails (livrés, ouverts, cliqués, etc.)

- **Templates**: SendGrid permet de créer des templates d'emails réutilisables (pour aller plus loin)

## 📞 Support

- Documentation SendGrid: https://docs.sendgrid.com
- Support SendGrid: https://support.sendgrid.com (disponible même en plan gratuit)
- Forum communautaire: https://community.sendgrid.com

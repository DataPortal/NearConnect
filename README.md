# NearConnect V4 Africa

Version moderne, multi-pays Afrique, avec:
- demande d'ouverture d'espace
- validation/admin création d'espaces QR
- géolocalisation automatique (aucune saisie manuelle des coordonnées)
- rayon max 100m
- espaces temporaires basés sur le fuseau horaire du pays
- purge complète des données personnelles + conservation des statistiques agrégées
- dashboard pays / villes / espaces

## Structure
- `supabase/schema.sql` : base complète
- `supabase/functions/*/index.ts` : Edge Functions
- `web/` : interface publique/admin/dashboard

## Secrets Supabase requis
- APP_ADMIN_MASTER_KEY
- APP_ENCRYPTION_KEY
- RW_MOMO_RECIPIENT
- DEFAULT_MOMO_RECIPIENT

## Bucket Storage
Créer: `participant-photos-temp`

## Flux
1. `request.html` : demande d'ouverture d'espace
2. `admin.html` : approbation + génération QR + désactivation + purge
3. `index.html` : accès client par QR, géolocalisation auto, inscription, paiement
4. `dashboard.html` : statistiques agrégées


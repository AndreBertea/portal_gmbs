#!/bin/bash

# ============================================
# Script de test pour le webhook Stripe
# ============================================
#
# Usage:
#   ./scripts/test-webhook.sh checkout    # Teste checkout.session.completed
#   ./scripts/test-webhook.sh update      # Teste subscription.updated
#   ./scripts/test-webhook.sh delete      # Teste subscription.deleted
#   ./scripts/test-webhook.sh payment     # Teste invoice.payment_failed
#   ./scripts/test-webhook.sh all         # Teste tous les événements
#

set -e

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/v1/webhooks/stripe}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stripe Webhook Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Vérifier que Stripe CLI est installé
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI n'est pas installé${NC}"
    echo "Installer avec: brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Vérifier que le serveur est up
echo -e "${YELLOW}🔍 Vérification du serveur...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" | grep -q "405"; then
    echo -e "${GREEN}✅ Serveur accessible${NC}"
else
    echo -e "${RED}❌ Serveur non accessible à $WEBHOOK_URL${NC}"
    echo "Assurez-vous que 'npm run dev' est lancé"
    exit 1
fi

echo ""

# Fonction pour tester un événement
test_event() {
    local event=$1
    local name=$2

    echo -e "${YELLOW}📤 Test: $name${NC}"
    echo "   Événement: $event"

    if stripe trigger "$event" 2>&1 | grep -q "Succeeded"; then
        echo -e "${GREEN}✅ $name - Succès${NC}"
        return 0
    else
        echo -e "${RED}❌ $name - Échec${NC}"
        return 1
    fi
}

# Fonction pour afficher les derniers tenants créés
check_database() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Vérification en base de données${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Pour vérifier les résultats, exécutez dans Supabase SQL Editor:"
    echo ""
    echo -e "${YELLOW}-- Derniers tenants créés${NC}"
    echo "SELECT id, name, subscription_status, subscription_plan, stripe_customer_id"
    echo "FROM tenants"
    echo "ORDER BY created_at DESC"
    echo "LIMIT 5;"
    echo ""
    echo -e "${YELLOW}-- API keys associées${NC}"
    echo "SELECT key_id, label, scopes, created_at"
    echo "FROM api_keys"
    echo "ORDER BY created_at DESC"
    echo "LIMIT 5;"
    echo ""
    echo -e "${YELLOW}-- Audit logs${NC}"
    echo "SELECT action, resource_type, details, created_at"
    echo "FROM audit_logs"
    echo "ORDER BY created_at DESC"
    echo "LIMIT 10;"
    echo ""
}

# Traiter les arguments
case "${1:-help}" in
    checkout)
        test_event "checkout.session.completed" "Création de tenant"
        check_database
        ;;

    update)
        test_event "customer.subscription.updated" "Mise à jour subscription"
        ;;

    delete)
        test_event "customer.subscription.deleted" "Annulation subscription"
        ;;

    payment)
        test_event "invoice.payment_failed" "Échec de paiement"
        ;;

    all)
        echo -e "${BLUE}🧪 Test de tous les événements${NC}"
        echo ""

        PASSED=0
        FAILED=0

        test_event "checkout.session.completed" "Création de tenant" && ((PASSED++)) || ((FAILED++))
        echo ""
        test_event "customer.subscription.updated" "Mise à jour subscription" && ((PASSED++)) || ((FAILED++))
        echo ""
        test_event "customer.subscription.deleted" "Annulation subscription" && ((PASSED++)) || ((FAILED++))
        echo ""
        test_event "invoice.payment_failed" "Échec de paiement" && ((PASSED++)) || ((FAILED++))

        echo ""
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}  Résumé${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo -e "${GREEN}✅ Réussis: $PASSED${NC}"
        echo -e "${RED}❌ Échoués: $FAILED${NC}"

        check_database
        ;;

    listen)
        echo -e "${YELLOW}🎧 Démarrage du listener Stripe...${NC}"
        echo "Forwarding vers: $WEBHOOK_URL"
        echo ""
        echo -e "${YELLOW}📝 Copiez le webhook secret (whsec_xxx) dans .env.local${NC}"
        echo ""
        stripe listen --forward-to "$WEBHOOK_URL"
        ;;

    help|*)
        echo "Usage: $0 {checkout|update|delete|payment|all|listen}"
        echo ""
        echo "Commandes disponibles:"
        echo "  checkout  - Teste checkout.session.completed"
        echo "  update    - Teste customer.subscription.updated"
        echo "  delete    - Teste customer.subscription.deleted"
        echo "  payment   - Teste invoice.payment_failed"
        echo "  all       - Teste tous les événements"
        echo "  listen    - Démarre le listener Stripe CLI"
        echo ""
        echo "Exemples:"
        echo "  $0 checkout"
        echo "  $0 all"
        echo "  WEBHOOK_URL=https://staging.gmbs.fr/api/v1/webhooks/stripe $0 all"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Tests terminés${NC}"

import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SECTIONS = [
    {
        title: '1. RESPONSABLE DU TRAITEMENT',
        body: 'EpiPay est un projet etudiant developpe dans le cadre d\'Epitech.\n\nContact DPO : dpo@epipay.epitech.digital',
    },
    {
        title: '2. DONNEES COLLECTEES',
        body:
            '\u2022 Identite : nom complet, adresse email @epitech.digital, campus\n' +
            '\u2022 Financieres : solde EpiCoin, historique des transactions (montants, types, dates)\n' +
            '\u2022 Localisation : coordonnees GPS et/ou geolocalisation par IP lors des transactions\n' +
            '\u2022 Appareil : modele, systeme d\'exploitation, identifiant de l\'appareil\n' +
            '\u2022 Biometrie : preference Face ID/Touch ID (stockee localement uniquement)\n' +
            '\u2022 Comportementales : patterns de transactions pour la detection de fraude',
    },
    {
        title: '3. FINALITES DU TRAITEMENT',
        body:
            '\u2022 Execution du service de portefeuille numerique\n' +
            '\u2022 Detection et prevention de la fraude (analyse comportementale)\n' +
            '\u2022 Securisation des transactions financieres\n\n' +
            'Nous ne revendons JAMAIS vos donnees. La collecte sert uniquement a proteger votre compte contre la fraude.',
    },
    {
        title: '4. BASE LEGALE',
        body:
            '\u2022 Execution du contrat (service de paiement)\n' +
            '\u2022 Interet legitime (detection de fraude)\n' +
            '\u2022 Consentement (geolocalisation, fingerprinting appareil)',
    },
    {
        title: '5. DUREE DE CONSERVATION',
        body:
            '\u2022 Donnees de compte : jusqu\'a suppression du compte\n' +
            '\u2022 Donnees de localisation : 30 jours\n' +
            '\u2022 Transactions : anonymisees apres suppression du compte\n' +
            '\u2022 Donnees de fraude : 5 ans (obligation legale AML)',
    },
    {
        title: '6. HEBERGEMENT DES DONNEES',
        body: 'Vos donnees sont hebergees sur Supabase, dont les serveurs sont situes a Frankfurt, Allemagne (Union Europeenne). Les paiements sont traites par Stripe (conforme RGPD).',
    },
    {
        title: '7. VOS DROITS',
        body:
            '\u2022 Droit d\'acces a vos donnees\n' +
            '\u2022 Droit de rectification\n' +
            '\u2022 Droit a l\'effacement (suppression de compte)\n' +
            '\u2022 Droit a la portabilite (export JSON)\n' +
            '\u2022 Droit d\'opposition au profilage\n\n' +
            'Contact : dpo@epipay.epitech.digital',
    },
    {
        title: '8. SECURITE',
        body:
            '\u2022 Chiffrement des communications (HTTPS/TLS)\n' +
            '\u2022 Authentification biometrique optionnelle\n' +
            '\u2022 Stockage securise des tokens (SecureStore)\n' +
            '\u2022 Detection de fraude en temps reel',
    },
    {
        title: '9. AGE MINIMUM',
        body: 'Vous devez avoir au moins 16 ans pour utiliser EpiPay.',
    },
    {
        title: '10. SOUS-TRAITANTS',
        body:
            '\u2022 Supabase (hebergement, base de donnees) — Frankfurt, DE\n' +
            '\u2022 Stripe (traitement des paiements) — UE\n' +
            '\u2022 ipapi.co (geolocalisation IP) — anonymise',
    },
    {
        title: '11. MODIFICATIONS',
        body: 'Nous vous informerons de toute modification substantielle de cette politique.',
    },
];

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Back button */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
            >
                <Icon name="chevron.left" size={28} color={Colors.black} />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.mainTitle}>POLITIQUE DE CONFIDENTIALITE</Text>
                <Text style={styles.appName}>EPIPAY</Text>

                <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>DERNIERE MISE A JOUR : MARS 2026</Text>
                </View>

                {/* Sections */}
                {SECTIONS.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionBody}>{section.body}</Text>
                    </View>
                ))}

                {/* Accept button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.acceptButton}
                    activeOpacity={0.85}
                >
                    <Text style={styles.acceptButtonText}>J'AI LU ET COMPRIS</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        position: 'absolute',
        top: 56,
        left: 16,
        zIndex: 10,
        width: 44,
        height: 44,
        borderWidth: 2,
        borderColor: '#181818',
        borderRadius: 0,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingTop: 112,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#181818',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    appName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#013AFB',
        letterSpacing: 4,
        marginBottom: 16,
    },
    dateBadge: {
        borderWidth: 2,
        borderColor: '#181818',
        borderRadius: 0,
        backgroundColor: '#F2F4F8',
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        marginBottom: 28,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#181818',
        letterSpacing: 1.5,
    },
    section: {
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#181818',
        borderRadius: 0,
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#013AFB',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    sectionBody: {
        fontSize: 14,
        fontWeight: '500',
        color: '#181818',
        lineHeight: 22,
    },
    acceptButton: {
        marginTop: 12,
        borderWidth: 2,
        borderColor: '#181818',
        borderRadius: 0,
        backgroundColor: '#013AFB',
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        // Brutalist shadow
        shadowColor: '#181818',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 6,
    },
    acceptButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
});

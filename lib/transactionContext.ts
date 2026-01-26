/**
 * Service de collecte de contexte pour les transactions
 * Collecte les informations d'appareil, de localisation et autres métadonnées
 * nécessaires pour la détection de fraude enrichie
 */

import * as Device from 'expo-device';
import * as Location from 'expo-location';

// Types pour les données de contexte
export interface DeviceInfo {
  device_id?: string;
  device_name?: string;
  device_model?: string;
  os_name?: string;
  os_version?: string;
  app_version?: string;
  ip?: string;
  user_agent?: string;
}

export interface LocationInfo {
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface TransactionContext {
  device_info: DeviceInfo;
  location_info: LocationInfo;
  timestamp: string;
}

/**
 * Collecte les informations de l'appareil
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  try {
    const deviceInfo: DeviceInfo = {
      device_id: Device.osBuildId || undefined,
      device_name: Device.deviceName || undefined,
      device_model: Device.modelName || undefined,
      os_name: Device.osName || undefined,
      os_version: Device.osVersion || undefined,
      app_version: '1.0.0', // TODO: Récupérer depuis app.json
    };

    // L'IP et user-agent seront collectés côté serveur depuis les headers HTTP
    return deviceInfo;
  } catch (error) {
    console.error('[TransactionContext] Error collecting device info:', error);
    return {};
  }
}

/**
 * Collecte la localisation de l'utilisateur
 * Essaie d'abord la géolocalisation GPS, puis fallback sur IP geolocation
 */
export async function getLocationInfo(): Promise<LocationInfo> {
  try {
    // Demander la permission de géolocalisation
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      // Obtenir la position GPS
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Essayer le géocodage inversé pour obtenir le pays et la ville
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const address = geocode[0];
          return {
            country: address.isoCountryCode || address.country || undefined,
            city: address.city || address.subregion || undefined,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
          };
        }
      } catch (geocodeError) {
        console.warn('[TransactionContext] Geocoding failed:', geocodeError);
      }

      // Retourner au moins les coordonnées
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    }

    // Si pas de permission GPS, fallback sur IP geolocation
    return await getLocationFromIP();
  } catch (error) {
    console.error('[TransactionContext] Error collecting location:', error);
    
    // Fallback sur IP geolocation
    return await getLocationFromIP();
  }
}

/**
 * Obtient la localisation approximative via l'IP
 * Utilise l'API gratuite ipapi.co
 */
async function getLocationFromIP(): Promise<LocationInfo> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('IP geolocation API failed');
    }

    const data = await response.json();
    
    return {
      country: data.country_code || data.country || undefined,
      city: data.city || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
    };
  } catch (error) {
    console.error('[TransactionContext] IP geolocation failed:', error);
    return {};
  }
}

/**
 * Collecte toutes les informations de contexte
 * Cette fonction doit être appelée avant chaque transaction
 */
export async function collectTransactionContext(): Promise<TransactionContext> {
  const [deviceInfo, locationInfo] = await Promise.all([
    getDeviceInfo(),
    getLocationInfo(),
  ]);

  return {
    device_info: deviceInfo,
    location_info: locationInfo,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Construit le payload de transaction enrichi pour l'Edge Function
 */
export interface EnrichedTransactionPayload {
  // Identifiants
  transaction_id?: string;
  provider: string;
  provider_tx_id?: string;

  // Acteurs
  initiator_user_id: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  recipientId?: string;

  // Financier
  amount: number;
  currency: string;

  // Type
  transaction_type: 'P2P' | 'MERCHANT' | 'CASHIN' | 'CASHOUT' | 'INTERCAMPUS';
  direction: 'outgoing' | 'incoming';

  // Timestamps
  created_at: string;
  provider_created_at?: string;
  executed_at?: string;

  // Localisation
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;

  // Contexte
  description?: string;
  device_info?: DeviceInfo;

  // Métadonnées
  metadata?: Record<string, any>;
}

export function buildTransactionPayload(params: {
  userId: string;
  amount: number;
  type: 'topup' | 'transfer' | 'purchase' | 'intercampus';
  recipientId?: string;
  recipientEmail?: string;
  productId?: string;
  description?: string;
  context: TransactionContext;
  metadata?: Record<string, any>;
}): EnrichedTransactionPayload {
  // Mapper les anciens types vers les nouveaux types normalisés
  const transactionTypeMap: Record<string, EnrichedTransactionPayload['transaction_type']> = {
    topup: 'CASHIN',
    transfer: 'P2P',
    purchase: 'MERCHANT',
    intercampus: 'INTERCAMPUS',
  };

  // Déterminer la direction
  const direction: 'outgoing' | 'incoming' = 
    params.type === 'topup' ? 'incoming' : 'outgoing';

  // Déterminer le provider
  const provider = params.type === 'topup' ? 'stripe' : 'wallet';

  const payload: EnrichedTransactionPayload = {
    // Identifiants
    provider,
    initiator_user_id: params.userId,
    recipientId: params.recipientId,

    // Financier
    amount: params.amount,
    currency: 'EPC', // Par défaut EPC, sauf pour topup où c'est EUR

    // Type
    transaction_type: transactionTypeMap[params.type],
    direction,

    // Timestamps
    created_at: new Date().toISOString(),

    // Localisation
    country: params.context.location_info.country,
    city: params.context.location_info.city,
    latitude: params.context.location_info.latitude,
    longitude: params.context.location_info.longitude,

    // Contexte
    description: params.description,
    device_info: params.context.device_info,

    // Métadonnées
    metadata: {
      ...params.metadata,
      recipient_email: params.recipientEmail,
      product_id: params.productId,
    },
  };

  return payload;
}

/**
 * Fonction helper pour logger le contexte (debug)
 */
export function logTransactionContext(context: TransactionContext): void {
  console.log('[TransactionContext] Collected context:', {
    device: context.device_info.device_model,
    os: `${context.device_info.os_name} ${context.device_info.os_version}`,
    location: `${context.location_info.city}, ${context.location_info.country}`,
    timestamp: context.timestamp,
  });
}

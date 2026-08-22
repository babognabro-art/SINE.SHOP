const { admin, firebaseApp, firebaseEnabled, projectId } = require('../config/firebase');

class PushService {
  // ENVOYER UNE PUSH NOTIFICATION
  static async sendPush(deviceTokens, title, body, data = {}, priority = 'high') {
    if (!firebaseEnabled) {
      console.log('📱 [MOCK] Push notification:', { title, body, tokens: deviceTokens?.length || 0 });
      return { success: true, mock: true };
    }

    try {
      // Convertir les données
      const firebaseData = {};
      for (const [key, value] of Object.entries(data)) {
        firebaseData[key] = String(value);
      }

      const message = {
        notification: {
          title: title.substring(0, 100),
          body: body.substring(0, 200),
        },
        data: firebaseData,
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            priority: priority === 'high' ? 'max' : 'normal',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              alert: {
                title: title,
                body: body,
              },
            },
          },
        },
        webpush: {
          notification: {
            title: title,
            body: body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: firebaseData,
          },
        },
      };

      // Token unique
      if (typeof deviceTokens === 'string') {
        message.token = deviceTokens;
        const response = await admin.messaging().send(message);
        return { success: true, messageId: response, tokens: [deviceTokens] };
      }

      // Multiples tokens
      if (Array.isArray(deviceTokens) && deviceTokens.length > 0) {
        const chunks = this.chunkArray(deviceTokens, 500);
        const results = [];

        for (const chunk of chunks) {
          const multicastMessage = { ...message, tokens: chunk };
          const response = await admin.messaging().sendEachForMulticast(multicastMessage);
          results.push({
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses.map(r => ({
              success: r.success,
              error: r.error ? r.error.message : null,
            })),
          });
        }

        return {
          success: true,
          totalTokens: deviceTokens.length,
          results,
        };
      }

      return { success: false, error: 'Invalid tokens format' };

    } catch (error) {
      console.error('❌ Push service error:', error);
      return { success: false, error: error.message };
    }
  }

  // ENREGISTRER UN APPAREIL
  static async registerDevice(userId, token, platform, browser = null, os = null) {
    try {
      const UserPreference = require('../models/UserPreference');
      
      let preferences = await UserPreference.findOne({ user: userId });
      
      if (!preferences) {
        preferences = new UserPreference({
          user: userId,
          devices: [],
          notifications: {
            email: { enabled: true, orderUpdates: true, promotions: false, securityAlerts: true },
            sms: { enabled: true, orderUpdates: true, promotions: false, securityAlerts: true },
            push: { enabled: true, orderUpdates: true, promotions: false, messages: true, securityAlerts: true },
            inApp: { enabled: true, orderUpdates: true, promotions: true, messages: true, securityAlerts: true },
          },
        });
      }

      const existingIndex = preferences.devices.findIndex(d => d.token === token);
      
      if (existingIndex > -1) {
        preferences.devices[existingIndex] = {
          ...preferences.devices[existingIndex],
          platform,
          browser: browser || preferences.devices[existingIndex].browser,
          os: os || preferences.devices[existingIndex].os,
          lastActive: new Date(),
          isActive: true,
        };
      } else {
        const maxDevices = parseInt(process.env.MAX_DEVICES_PER_USER) || 5;
        if (preferences.devices.length >= maxDevices) {
          preferences.devices.sort((a, b) => a.lastActive - b.lastActive);
          preferences.devices.shift();
        }
        
        preferences.devices.push({
          token,
          platform,
          browser,
          os,
          lastActive: new Date(),
          isActive: true,
        });
      }

      await preferences.save();
      console.log(`📱 Device registered: ${platform} for user ${userId}`);
      
      return { success: true, devices: preferences.devices };
    } catch (error) {
      console.error('❌ Register device error:', error);
      return { success: false, error: error.message };
    }
  }

  // OBTENIR LES TOKENS D'UN UTILISATEUR
  static async getUserActiveTokens(userId) {
    try {
      const UserPreference = require('../models/UserPreference');
      const preferences = await UserPreference.findOne({ user: userId });
      
      if (!preferences) {
        return { success: true, tokens: [] };
      }
      
      const tokens = preferences.devices
        .filter(d => d.isActive)
        .map(d => d.token);
      
      return { success: true, tokens };
    } catch (error) {
      console.error('❌ Get user tokens error:', error);
      return { success: false, error: error.message, tokens: [] };
    }
  }

  // ENVOYER À UN UTILISATEUR
  static async sendPushToUser(userId, title, body, data = {}, priority = 'high') {
    const tokensResult = await this.getUserActiveTokens(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: false, error: 'No active devices', tokens: [] };
    }

    return await this.sendPush(tokensResult.tokens, title, body, data, priority);
  }

  // ENVOYER À PLUSIEURS UTILISATEURS
  static async sendPushToUsers(userIds, title, body, data = {}, priority = 'high') {
    const allTokens = [];
    const usersWithDevices = [];

    for (const userId of userIds) {
      const tokensResult = await this.getUserActiveTokens(userId);
      if (tokensResult.success && tokensResult.tokens.length > 0) {
        allTokens.push(...tokensResult.tokens);
        usersWithDevices.push(userId);
      }
    }

    if (allTokens.length === 0) {
      return { success: false, error: 'No active devices for users' };
    }

    const result = await this.sendPush(allTokens, title, body, data, priority);
    return {
      ...result,
      usersNotified: usersWithDevices,
      totalUsers: userIds.length,
    };
  }

  // DÉSACTIVER UN APPAREIL
  static async deactivateDevice(token) {
    try {
      const UserPreference = require('../models/UserPreference');
      const result = await UserPreference.updateOne(
        { 'devices.token': token },
        { $set: { 'devices.$.isActive': false } }
      );
      
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.error('❌ Deactivate device error:', error);
      return { success: false, error: error.message };
    }
  }

  // SUPPRIMER UN APPAREIL
  static async removeDevice(userId, token) {
    try {
      const UserPreference = require('../models/UserPreference');
      const result = await UserPreference.updateOne(
        { user: userId },
        { $pull: { devices: { token: token } } }
      );
      
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.error('❌ Remove device error:', error);
      return { success: false, error: error.message };
    }
  }

  // MÉTHODE UTILITAIRE
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static isEnabled() {
    return firebaseEnabled;
  }
}

module.exports = PushService;
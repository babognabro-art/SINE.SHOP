const { sendSMS, sendVerificationSMS, sendOrderSMS, sendDeliverySMS } = require('../config/sms');
const { sendWhatsAppText } = require('../config/whatsapp');
const logger = require('../utils/logger');

class SMSService {
  // =========================================================
  // PASSEZ VERS WHATSAPP — envoi prioritaire via WhatsApp,
  // fallback SMS en cas d'échec (si le numéro n'est pas sur WhatsApp)
  // =========================================================
  
  static async sendWhatsApp(to, message) {
    try {
      return await sendWhatsAppText(to, message);
    } catch (error) {
      logger.warn(`⚠️ WhatsApp non disponible pour ${to}, fallback SMS:`, error.message);
      return null;
    }
  }

  // Passerelle générique — utilisée par notification.service.js
  static async sendSMS(to, message) {
    // ✅ TENTE D'ABORD WHATSAPP
    try {
      const result = await this.sendWhatsApp(to, message);
      if (result) return result;
    } catch (e) {
      logger.warn('⚠️ Échec WhatsApp, fallback SMS:', e.message);
    }
    // Fallback SMS
    return await sendSMS(to, message);
  }

  // VÉRIFICATION — priorité WhatsApp
  static async sendVerification(to, code, name) {
    const message = `🔐 SINE.SHOP - Bonjour ${name || ''}, votre code de vérification est : ${code}. Valable 5 minutes. Ne le partagez avec personne.`;
    
    // ✅ TENTE D'ABORD WHATSAPP
    try {
      const result = await this.sendWhatsApp(to, message);
      if (result) {
        logger.info(`📱 Code de vérification envoyé via WhatsApp à ${to}`);
        return result;
      }
    } catch (e) {
      logger.warn('⚠️ Échec WhatsApp pour la vérification, fallback SMS:', e.message);
    }
    
    // Fallback SMS
    return await sendVerificationSMS(to, code, name);
  }

  static async sendPasswordReset(to, code, name) {
    const message = `🔐 SINE.SHOP - Bonjour ${name}, votre code de réinitialisation de mot de passe est : ${code} (Valable 48 heures). Code confidentiel, ne le partagez avec personne.`;
    
    try {
      const result = await this.sendWhatsApp(to, message);
      if (result) {
        logger.info(`📱 Code de réinitialisation envoyé via WhatsApp à ${to}`);
        return result;
      }
    } catch (e) {
      logger.warn('⚠️ Échec WhatsApp pour le reset, fallback SMS:', e.message);
    }
    
    return await sendSMS(to, message);
  }

  static async sendOrderUpdate(to, orderId, status) {
    const message = `📦 SINE.SHOP - Votre commande #${orderId} est maintenant ${status}. Suivez-la sur https://www.sineshophome.com`;
    return await this.sendSMS(to, message);
  }

  static async sendDeliveryInfo(to, orderId, livreurName) {
    const message = `🚚 SINE.SHOP - ${livreurName} est en route pour livrer votre commande #${orderId}. Suivez-la en direct sur https://www.sineshophome.com/suivi.html?commande=${orderId}`;
    return await this.sendSMS(to, message);
  }

  static async sendOTP(to, otp) {
    const message = `🔐 Votre code OTP ${process.env.APP_NAME || 'SINE.SHOP'} est: ${otp}. Valable 5 minutes.`;
    return await this.sendSMS(to, message);
  }

  static async sendWelcome(to, name) {
    const message = `🎉 Bienvenue ${name} sur ${process.env.APP_NAME || 'SINE.SHOP'} ! Nous sommes ravis de vous compter parmi nous.`;
    return await this.sendSMS(to, message);
  }

  static async sendOrderConfirmation(to, orderId, total) {
    const message = `✅ Votre commande #${orderId} de ${total} a été confirmée. Merci de choisir ${process.env.APP_NAME || 'SINE.SHOP'}.`;
    return await this.sendSMS(to, message);
  }
}

module.exports = SMSService;
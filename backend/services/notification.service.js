const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const User = require('../models/User');
const EmailService = require('./email.service');
const SMSService = require('./sms.service');
const PushService = require('./push.service');
const SocketService = require('./socket.service');
const { sendMail } = require('../config/mail');

class NotificationService {
  // MÉTHODE PRINCIPALE POUR ENVOYER UNE NOTIFICATION
  static async send({
    userId,
    type,
    title,
    message,
    data = {},
    priority = 'medium',
    channels = ['in_app', 'email', 'sms', 'push'],
    eventId = null,
    eventModel = null,
    link = null,
  }) {
    try {
      // 1. Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Récupérer les préférences
      const preferences = await UserPreference.findOne({ user: userId });
      const prefs = preferences ? preferences.notifications : {};

      // 3. Créer la notification en base de données
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        priority,
        eventId,
        eventModel,
        // Lien de destination (voir Notification.link) — pris en priorité
        // sur le paramètre explicite, avec repli sur data.link pour les
        // appelants qui le passaient déjà dans data avant l'ajout de ce
        // champ dédié.
        link: link || data.link || undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // 4. Envoyer sur chaque canal
      const results = {};
      const sentChannels = [];

      // Vérifier les canaux autorisés
      const channelsToSend = channels.filter(channel => {
        if (channel === 'email' && !user.email) return false;
        if (channel === 'sms' && !user.phone) return false;
        return true;
      });

      // IN-APP (toujours envoyé)
      if (channelsToSend.includes('in_app') && prefs.inApp?.enabled !== false) {
        const inAppResult = await this.sendInApp(notification, user);
        results.in_app = inAppResult;
        if (inAppResult.success) sentChannels.push('in_app');
      }

      // EMAIL
      if (channelsToSend.includes('email') && prefs.email?.enabled !== false) {
        const emailResult = await this.sendEmail(notification, user);
        results.email = emailResult;
        if (emailResult.success) sentChannels.push('email');
      }

      // SMS
      if (channelsToSend.includes('sms') && prefs.sms?.enabled !== false) {
        const smsResult = await this.sendSMS(notification, user);
        results.sms = smsResult;
        if (smsResult.success) sentChannels.push('sms');
      }

      // PUSH
      if (channelsToSend.includes('push') && prefs.push?.enabled !== false) {
        const pushResult = await this.sendPush(notification, user);
        results.push = pushResult;
        if (pushResult.success) sentChannels.push('push');
      }

      // 5. Mettre à jour le statut
      if (sentChannels.length > 0) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        notification.deliveredAt = new Date();
        await notification.save();
      }

      // 6. Log
      console.log(`📨 Notification sent to ${user.email}: ${type} via ${sentChannels.join(', ')}`);

      return {
        success: true,
        notification,
        channels: sentChannels,
        results,
      };

    } catch (error) {
      console.error('❌ Notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ENVOYER UNE NOTIFICATION IN-APP
  static async sendInApp(notification, user) {
    try {
      notification.inAppSent = true;
      await notification.save();

      // Envoyer via Socket.io en temps réel
      SocketService.sendToUser(user._id, 'new-notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt,
      });

      return { success: true };
    } catch (error) {
      console.error('❌ In-app notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // ENVOYER UN EMAIL
  static async sendEmail(notification, user) {
    try {
      // Vérifier si l'email est activé — le projet utilise Brevo
      // (config/mail.js), jamais MAIL_USER/nodemailer classique.
      const { mailEnabled } = require('../config/mail');
      if (!mailEnabled) {
        console.log('📧 Email service disabled');
        return { success: false, error: 'Email service disabled' };
      }

      // Construire le template HTML
      const html = this.buildEmailTemplate(notification, user);

      // Envoyer l'email
      await sendMail(
        user.email,
        notification.title,
        html
      );

      notification.emailSent = true;
      await notification.save();

      return { success: true };
    } catch (error) {
      console.error('❌ Email error:', error);
      notification.emailError = error.message;
      await notification.save();
      return { success: false, error: error.message };
    }
  }

  // CONSTRUIRE LE TEMPLATE EMAIL
  static buildEmailTemplate(notification, user) {
    const appName = process.env.APP_NAME || 'SINE.SHOP';
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5500';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0; margin: -20px -20px 0 -20px; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .header .logo { font-size: 32px; margin-bottom: 10px; }
          .content { padding: 30px 20px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; margin: 10px 0; }
          .notification-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
          .notification-box .title { font-weight: 700; color: #333; font-size: 16px; }
          .notification-box .message { color: #555; margin-top: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: 600; }
          .button:hover { background: #5a67d8; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; margin: 0 -20px -20px -20px; }
          .footer a { color: #667eea; text-decoration: none; }
          .badge { display: inline-block; padding: 4px 12px; background: ${notification.priority === 'high' ? '#e53e3e' : notification.priority === 'medium' ? '#ed8936' : '#48bb78'}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600; }
          @media (max-width: 480px) {
            .container { padding: 10px; }
            .header { padding: 20px 10px; }
            .content { padding: 20px 10px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛍️</div>
            <h1>${appName}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${notification.type.replace('_', ' ').toUpperCase()}</p>
          </div>
          <div class="content">
            <h2>Bonjour ${user.firstName} ${user.lastName},</h2>
            <div class="notification-box">
              <div class="title">${notification.title}</div>
              <div class="message">${notification.message}</div>
            </div>
            
            ${notification.data?.orderId ? `
              <p style="text-align: center;">
                <a href="${appUrl}/orders/${notification.data.orderId}" class="button">Voir ma commande</a>
              </p>
            ` : ''}
            
            ${notification.data?.productId ? `
              <p style="text-align: center;">
                <a href="${appUrl}/products/${notification.data.productId}" class="button">Voir le produit</a>
              </p>
            ` : ''}
            
            ${notification.data?.link ? `
              <p style="text-align: center;">
                <a href="${notification.data.link}" class="button">En savoir plus</a>
              </p>
            ` : ''}
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Vous recevez cet email car vous êtes inscrit sur ${appName}. 
              Pour gérer vos préférences, <a href="${appUrl}/settings/notifications" style="color: #667eea;">cliquez ici</a>.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${appName}. Tous droits réservés.</p>
            <p>
              <a href="${appUrl}/privacy">Politique de confidentialité</a> • 
              <a href="${appUrl}/cgu">CGU</a> • 
              <a href="${appUrl}/unsubscribe">Se désinscrire</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ENVOYER UN SMS
  static async sendSMS(notification, user) {
    try {
      // Le projet utilise Infobip (config/sms.js), jamais Twilio.
      const { smsEnabled } = require('../config/sms');
      if (!smsEnabled) {
        console.log('📱 SMS service disabled');
        return { success: false, error: 'SMS service disabled' };
      }

      // Tronquer le message si trop long (160 caractères)
      let smsMessage = notification.message;
      if (smsMessage.length > 150) {
        smsMessage = smsMessage.substring(0, 147) + '...';
      }

      await SMSService.sendSMS(user.phone, smsMessage);

      notification.smsSent = true;
      await notification.save();

      return { success: true };
    } catch (error) {
      console.error('❌ SMS error:', error);
      notification.smsError = error.message;
      await notification.save();
      return { success: false, error: error.message };
    }
  }

  // ENVOYER UNE PUSH NOTIFICATION
  static async sendPush(notification, user) {
    try {
      // Récupérer les préférences pour obtenir les tokens
      const preferences = await UserPreference.findOne({ user: user._id });
      if (!preferences || !preferences.devices || preferences.devices.length === 0) {
        return { success: false, error: 'No push devices found' };
      }

      // Filtrer les appareils actifs
      const devices = preferences.devices.filter(d => d.isActive);
      if (devices.length === 0) {
        return { success: false, error: 'No active devices' };
      }

      // Envoyer la push notification
      const pushResult = await PushService.sendPush(
        devices.map(d => d.token),
        notification.title,
        notification.message,
        notification.data,
        notification.priority
      );

      notification.pushSent = true;
      await notification.save();

      return { success: true, result: pushResult };
    } catch (error) {
      console.error('❌ Push error:', error);
      notification.pushError = error.message;
      await notification.save();
      return { success: false, error: error.message };
    }
  }

  // NOTIFICATIONS PRÉDÉFINIES

  // 1. Bienvenue
  static async sendWelcome(user) {
    return await this.send({
      userId: user._id,
      type: 'welcome',
      title: `Bienvenue sur ${process.env.APP_NAME || 'SINE.SHOP'} ! 🎉`,
      message: `Nous sommes ravis de vous compter parmi nous. Découvrez notre sélection de produits !`,
      data: { action: 'explore' },
      priority: 'high',
      channels: ['email', 'in_app'],
    });
  }

  // 2. Vérification email
  static async sendVerification(user, code) {
    return await this.send({
      userId: user._id,
      type: 'verification',
      title: 'Vérifiez votre compte',
      message: `Votre code de vérification est : ${code}. Valable 24 heures.`,
      data: { code, action: 'verify' },
      priority: 'high',
      channels: ['email', 'sms', 'in_app'],
    });
  }

  // 3. Réinitialisation mot de passe
  static async sendPasswordReset(user, code) {
    return await this.send({
      userId: user._id,
      type: 'password_reset',
      title: 'Réinitialisation de votre mot de passe',
      message: `Votre code de réinitialisation est : ${code}. Valable 5 minutes..`,
      data: { code, action: 'reset_password' },
      priority: 'high',
      channels: ['email', 'sms', 'in_app'],
    });
  }

  // 4. Confirmation de commande
  static async sendOrderCreated(user, order) {
    return await this.send({
      userId: user._id,
      type: 'order_created',
      title: `Commande #${order.orderNumber} créée ✅`,
      message: `Votre commande a été créée avec succès. Montant : ${order.total} ${order.currency}`,
      data: { orderId: order._id, orderNumber: order.orderNumber, total: order.total },
      priority: 'high',
      channels: ['email', 'sms', 'in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  }

  // 5. Commande confirmée
  static async sendOrderConfirmed(user, order) {
    return await this.send({
      userId: user._id,
      type: 'order_confirmed',
      title: `Commande #${order.orderNumber} confirmée ✅`,
      message: `Votre paiement a été validé. Votre commande est en préparation.`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
      priority: 'high',
      channels: ['email', 'sms', 'in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  }

  // 6. Commande expédiée
  static async sendOrderShipped(user, order, livreur) {
    return await this.send({
      userId: user._id,
      type: 'order_shipped',
      title: `Commande #${order.orderNumber} expédiée 📦`,
      message: `Votre commande est en route ! Livreur : ${livreur.firstName} ${livreur.lastName}`,
      data: { orderId: order._id, orderNumber: order.orderNumber, livreur: livreur._id },
      priority: 'high',
      channels: ['email', 'sms', 'in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  }

  // 7. Commande livrée
  static async sendOrderDelivered(user, order) {
    return await this.send({
      userId: user._id,
      type: 'order_delivered',
      title: `Commande #${order.orderNumber} livrée 🎉`,
      message: `Votre commande a été livrée avec succès. Nous espérons que vous êtes satisfait !`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
      priority: 'high',
      channels: ['email', 'sms', 'in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  }

  // 8. Paiement réussi
  static async sendPaymentSuccess(user, payment) {
    return await this.send({
      userId: user._id,
      type: 'payment_success',
      title: `Paiement de ${payment.amount} ${payment.currency} validé 💳`,
      message: `Votre paiement a été effectué avec succès. Référence : ${payment.reference}`,
      data: { paymentId: payment._id, amount: payment.amount, reference: payment.reference },
      priority: 'high',
      channels: ['email', 'in_app', 'push'],
      eventId: payment._id,
      eventModel: 'Payment',
    });
  }

  // 9. Rappel de panier abandonné
  static async sendCartReminder(user, cart) {
    return await this.send({
      userId: user._id,
      type: 'cart_reminder',
      title: `🛒 Vos articles vous attendent !`,
      message: `Vous avez ${cart.items.length} article(s) dans votre panier. Ne les laissez pas passer !`,
      data: { cartItems: cart.items.length, action: 'view_cart' },
      priority: 'medium',
      channels: ['email', 'in_app', 'push'],
    });
  }

  // 10. Promotion spéciale
  static async sendPromotion(user, products) {
    return await this.send({
      userId: user._id,
      type: 'promotion',
      title: `🔥 Promotion exceptionnelle !`,
      message: `Découvrez ${products.length} produits en promotion pour vous !`,
      data: { products, action: 'view_promotions' },
      priority: 'medium',
      channels: ['email', 'in_app', 'push'],
    });
  }

  // 11. Nouveau message
  static async sendNewMessage(user, message, sender) {
    return await this.send({
      userId: user._id,
      type: 'message',
      title: `💬 Nouveau message de ${sender.firstName} ${sender.lastName}`,
      message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      data: { messageId: message._id, sender: sender._id },
      priority: 'medium',
      channels: ['in_app', 'push'],
    });
  }

  // 12. Mise à jour livraison
  static async sendDeliveryUpdate(user, order, location) {
    return await this.send({
      userId: user._id,
      type: 'delivery_update',
      title: `📍 Mise à jour livraison #${order.orderNumber}`,
      message: `Votre livreur est à ${location.distance} de votre adresse. Arrivée estimée : ${location.eta}`,
      data: { orderId: order._id, location },
      priority: 'high',
      channels: ['sms', 'in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  }

  // 13. Alerte sécurité
  static async sendSecurityAlert(user, alert) {
    return await this.send({
      userId: user._id,
      type: 'security',
      title: `🔒 Alerte de sécurité`,
      message: alert.message,
      data: alert.data || {},
      priority: 'critical',
      channels: ['email', 'sms', 'in_app', 'push'],
    });
  }

  // 14. Alerte fraude
  static async sendFraudAlert(admin, alert) {
    return await this.send({
      userId: admin._id,
      type: 'fraud_alert',
      title: `🚨 ALERTE FRAUDE DÉTECTÉE !`,
      message: `Commande suspecte détectée. Score : ${alert.score}. ${alert.reasons.join(', ')}`,
      data: alert,
      priority: 'critical',
      channels: ['email', 'in_app', 'push'],
    });
  }

  // 15. Réservation confirmée
  static async sendReservationConfirmed(user, reservation) {
    return await this.send({
      userId: user._id,
      type: 'reservation',
      title: `✅ Réservation confirmée`,
      message: `Votre réservation du ${new Date(reservation.startDate).toLocaleDateString()} est confirmée.`,
      data: { reservationId: reservation._id },
      priority: 'high',
      channels: ['email', 'sms', 'in_app', 'push'],
      eventId: reservation._id,
      eventModel: 'Reservation',
    });
  }
}

module.exports = NotificationService;
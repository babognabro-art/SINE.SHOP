const test = require('node:test');
const assert = require('node:assert/strict');

test('Product supports optional description, variants and media', () => {
  const Product = require('../models/Product');
  assert.equal(Product.schema.path('description').options.required, false);
  assert.ok(Product.schema.path('videos'));
  assert.equal(Product.schema.path('attributes').instance, 'Map');
  assert.equal(Product.schema.path('attributes').options.of, require('mongoose').Schema.Types.Mixed);
});

test('Reservation has server-side 72h expiration field', () => {
  const Reservation = require('../models/Reservation');
  assert.ok(Reservation.schema.path('expiresAt'));
  assert.ok(Reservation.schema.path('convertedToOrder'));
});

test('Messaging supports reactions', () => {
  const Message = require('../models/Message');
  assert.ok(Message.schema.path('reactions'));
});

test('App reviews enforce a 1..5 rating', () => {
  const AppReview = require('../models/AppReview');
  assert.equal(AppReview.schema.path('rating').options.min, 1);
  assert.equal(AppReview.schema.path('rating').options.max, 5);
});

test('Email templates expose the four supported languages', () => {
  const { renderEmail } = require('../config/emailTemplates');
  for (const lang of ['fr','en','es','ar']) {
    const result = renderEmail('password', lang, { user_name:'Test', otp_code:'123456', expiry_minutes:'5 minutes', button_url:'https://example.com' });
    assert.match(result.html, /SINE\.SH/);
    assert.match(result.html, /123456/);
    assert.match(result.html, /5 minutes|5 minutos|5 دقائق/);
  }
});


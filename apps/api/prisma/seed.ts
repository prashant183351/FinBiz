import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default payment gateway configurations
  console.log('💳 Creating payment gateway configurations...')

  const gateways = [
    {
      gateway: 'razorpay',
      isActive: true,
      testMode: true,
      config: {
        apiKey: process.env['RAZORPAY_KEY_ID'] || 'rzp_test_your_key_id',
        apiSecret: process.env['RAZORPAY_KEY_SECRET'] || 'your_razorpay_secret',
        webhookSecret: process.env['RAZORPAY_WEBHOOK_SECRET'] || 'your_webhook_secret'
      }
    },
    {
      gateway: 'phonepe',
      isActive: true,
      testMode: true,
      config: {
        apiKey: process.env['PHONEPE_MERCHANT_ID'] || 'your_merchant_id',
        apiSecret: process.env['PHONEPE_SALT_KEY'] || 'your_salt_key',
        saltIndex: process.env['PHONEPE_SALT_INDEX'] || '1',
        webhookSecret: process.env['PHONEPE_WEBHOOK_SECRET'] || 'your_webhook_secret'
      }
    }
  ]

  for (const gateway of gateways) {
    await prisma.gatewayConfig.upsert({
      where: { gateway: gateway.gateway },
      update: gateway,
      create: gateway
    })
  }

  console.log('✅ Payment gateway configurations created')

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

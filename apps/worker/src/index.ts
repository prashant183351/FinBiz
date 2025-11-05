import dotenv from 'dotenv'
import { ReportCalculator } from './jobs/report-calculator'
import { BackupScheduler } from './jobs/backup-scheduler'
import { InventoryMonitor } from './jobs/inventory-monitor'

dotenv.config()

async function startWorkers() {
  console.log('🚀 Starting FinNbiz Workers...')

  // Initialize and start backup scheduler
  BackupScheduler.init()
  await BackupScheduler.start()

  // Initialize and start inventory monitor
  InventoryMonitor.init()
  await InventoryMonitor.start()

  // Start report calculation worker
  await ReportCalculator.start()

  console.log('✅ All workers started successfully')
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down FinNbiz Workers...')

  await ReportCalculator.stop()
  await BackupScheduler.stop()
  await InventoryMonitor.stop()

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start all workers
startWorkers().catch((error) => {
  console.error('Failed to start workers:', error)
  process.exit(1)
})

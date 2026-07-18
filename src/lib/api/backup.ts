import { apiRequest } from './client'

export function checkBackupHealth() {
  return apiRequest('backup.health')
}

export function listBackups() {
  return apiRequest('backups.list', { limit: 20 })
}

export function runBackupNow() {
  return apiRequest('backup.runNow', {}, { dedupe: false })
}
'use client';

/**
 * BackupService - Handles automatic data backups and recovery
 */

class BackupService {
    constructor(options = {}) {
        this.storageKeyPrefix = options.storageKeyPrefix || 'wardform_backup_';
        this.backupInterval = options.backupInterval || 30000; // 30 seconds
        this.maxBackups = options.maxBackups || 5;
        this.currentIntervalId = null;
    }
    
    /**
     * Generate a storage key for a specific form
     * @param {string} formId - Unique identifier for the form
     * @returns {string} - Storage key
     */
    getStorageKey(formId) {
        return `${this.storageKeyPrefix}${formId}`;
    }
    
    /**
     * Start automatic backups
     * @param {string} formId - Form identifier 
     * @param {Function} getFormData - Function that returns current form data
     * @returns {BackupService} - The service instance for chaining
     */
    startAutoBackup(formId, getFormData) {
        // Stop any existing backup
        this.stopAutoBackup();
        
        // Start new backup interval
        this.currentIntervalId = setInterval(() => {
            try {
                const formData = getFormData();
                if (formData) {
                    this.saveBackup(formId, formData);
                }
            } catch (error) {
                console.error('Auto backup failed:', error);
            }
        }, this.backupInterval);
        
        return this;
    }
    
    /**
     * Stop automatic backups
     * @returns {BackupService} - The service instance for chaining
     */
    stopAutoBackup() {
        if (this.currentIntervalId) {
            clearInterval(this.currentIntervalId);
            this.currentIntervalId = null;
        }
        return this;
    }
    
    /**
     * Save a backup of form data
     * @param {string} formId - Form identifier
     * @param {Object} formData - Form data to backup
     */
    saveBackup(formId, formData) {
        try {
            const key = this.getStorageKey(formId);
            
            // Get existing backups
            const existingBackups = this.getBackups(formId);
            
            // Create new backup
            const newBackup = {
                data: formData,
                timestamp: Date.now(),
            };
            
            // Add new backup to the beginning
            const updatedBackups = [
                newBackup,
                ...existingBackups.slice(0, this.maxBackups - 1)
            ];
            
            // Save to storage
            localStorage.setItem(key, JSON.stringify(updatedBackups));
            
            return true;
        } catch (error) {
            console.error('Failed to save backup:', error);
            return false;
        }
    }
    
    /**
     * Get all backups for a form
     * @param {string} formId - Form identifier
     * @returns {Array} - List of backups sorted by timestamp
     */
    getBackups(formId) {
        try {
            const key = this.getStorageKey(formId);
            const backupsString = localStorage.getItem(key);
            
            if (!backupsString) return [];
            
            return JSON.parse(backupsString);
        } catch (error) {
            console.error('Failed to retrieve backups:', error);
            return [];
        }
    }
    
    /**
     * Get the most recent backup for a form
     * @param {string} formId - Form identifier
     * @returns {Object|null} - Most recent backup or null if none exists
     */
    getLatestBackup(formId) {
        const backups = this.getBackups(formId);
        return backups.length > 0 ? backups[0] : null;
    }
    
    /**
     * Restore from a specific backup
     * @param {string} formId - Form identifier
     * @param {number} index - Index of backup to restore (0 = most recent)
     * @returns {Object|null} - Restored data or null if backup doesn't exist
     */
    restoreBackup(formId, index = 0) {
        const backups = this.getBackups(formId);
        
        if (backups.length === 0 || index >= backups.length) {
            return null;
        }
        
        return backups[index].data;
    }
    
    /**
     * Clear all backups for a form
     * @param {string} formId - Form identifier
     * @returns {boolean} - Success status
     */
    clearBackups(formId) {
        try {
            const key = this.getStorageKey(formId);
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to clear backups:', error);
            return false;
        }
    }
}

// Export a singleton instance
export const backupService = new BackupService();

// Export the class for custom instances
export default BackupService;

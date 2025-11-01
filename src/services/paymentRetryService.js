/**
 * Payment Retry Service
 * Handles API calls for subscription payment retry management
 */

import csrfClient from '../utils/csrfClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
const API_BASE = `${API_BASE_URL}/api/payment/subscription-retry`;

class PaymentRetryService {
    /**
     * Get system health status
     */
    async getHealthStatus() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to get health status:', error);
            throw error;
        }
    }

    /**
     * Get retry statistics
     */
    async getStats() {
        try {
            const response = await csrfClient.fetchWithCSRF(`${API_BASE}/stats`, {
                method: 'GET'
            });
            return response;
        } catch (error) {
            console.error('Failed to get stats:', error);
            throw error;
        }
    }

    /**
     * Get pending retries
     */
    async getPendingRetries() {
        try {
            const response = await csrfClient.fetchWithCSRF(`${API_BASE}/pending`, {
                method: 'GET'
            });
            return response;
        } catch (error) {
            console.error('Failed to get pending retries:', error);
            throw error;
        }
    }

    /**
     * Get retry job status
     */
    async getJobStatus() {
        try {
            const response = await csrfClient.fetchWithCSRF(`${API_BASE}/job-status`, {
                method: 'GET'
            });
            return response;
        } catch (error) {
            console.error('Failed to get job status:', error);
            throw error;
        }
    }

    /**
     * Execute manual retry for a specific merchant trade number
     */
    async executeRetry(merchantTradeNo) {
        try {
            const response = await csrfClient.post(`${API_BASE}/execute/${merchantTradeNo}`, {});
            return response;
        } catch (error) {
            console.error('Failed to execute retry:', error);
            throw error;
        }
    }

    /**
     * Cancel retry for a specific merchant trade number
     */
    async cancelRetry(merchantTradeNo) {
        try {
            const response = await csrfClient.post(`${API_BASE}/cancel/${merchantTradeNo}`, {});
            return response;
        } catch (error) {
            console.error('Failed to cancel retry:', error);
            throw error;
        }
    }

    /**
     * Get retry history for a specific merchant trade number
     */
    async getRetryHistory(merchantTradeNo) {
        try {
            const response = await csrfClient.fetchWithCSRF(`${API_BASE}/history/${merchantTradeNo}`, {
                method: 'GET'
            });
            return response;
        } catch (error) {
            console.error('Failed to get retry history:', error);
            throw error;
        }
    }

    /**
     * Manually trigger the retry job
     */
    async runRetryJob() {
        try {
            const response = await csrfClient.post(`${API_BASE}/run-job`, {});
            return response;
        } catch (error) {
            console.error('Failed to run retry job:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new PaymentRetryService();
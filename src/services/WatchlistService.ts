import axios from "axios";
import { watchListUrl } from "../utils/urls";
import axiosInstance from "../utils/axiosInstance";

// Types for watchlist entries
export interface WatchlistEntry {
    id: string;
    symbol: string;
    urgency: string;
    timeframe: string;
    desired_entry: number;
    current_price: number;
    distance_to_entry: number;
    entry_date?: string;
    entry_time?: string;
    status?: string;
    notes?: string;
}

export interface WatchlistResponse {
    success: boolean;
    data: WatchlistEntry[];
    message?: string;
    total_count?: number;
}

export interface WatchlistError {
    success: false;
    message: string;
    error?: string;
}

class WatchlistService {
    /**
     * Get all watchlist entries
     * @returns Promise<WatchlistResponse> - Watchlist entries data
     */
    async getWatchlistEntries(): Promise<WatchlistResponse> {
        try {
            const response = await axiosInstance.get<WatchlistResponse>(watchListUrl);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching watchlist entries:', error);

            // Return a standardized error response
            if (error.response?.data) {
                return {
                    success: false,
                    message: error.response.data.message || 'Failed to fetch watchlist entries',
                    data: []
                };
            }

            return {
                success: false,
                message: error.message || 'Network error occurred while fetching watchlist',
                data: []
            };
        }
    }

    /**
     * Get watchlist entries by status
     * @param status - Filter entries by status (e.g., 'active', 'completed', 'cancelled')
     * @returns Promise<WatchlistResponse> - Filtered watchlist entries
     */
    async getWatchlistEntriesByStatus(status: string): Promise<WatchlistResponse> {
        try {
            const response = await axiosInstance.get<WatchlistResponse>(`${watchListUrl}?status=${status}`);
            return response.data;
        } catch (error: any) {
            console.error(`Error fetching watchlist entries with status ${status}:`, error);

            if (error.response?.data) {
                return {
                    success: false,
                    message: error.response.data.message || `Failed to fetch watchlist entries with status ${status}`,
                    data: []
                };
            }

            return {
                success: false,
                message: error.message || 'Network error occurred while fetching watchlist',
                data: []
            };
        }
    }

    /**
     * Get watchlist entry by ID
     * @param id - Watchlist entry ID
     * @returns Promise<WatchlistResponse> - Single watchlist entry
     */
    async getWatchlistEntryById(id: string): Promise<WatchlistResponse> {
        try {
            const response = await axiosInstance.get<WatchlistResponse>(`${watchListUrl}/${id}`);
            return response.data;
        } catch (error: any) {
            console.error(`Error fetching watchlist entry ${id}:`, error);

            if (error.response?.data) {
                return {
                    success: false,
                    message: error.response.data.message || `Failed to fetch watchlist entry ${id}`,
                    data: []
                };
            }

            return {
                success: false,
                message: error.message || 'Network error occurred while fetching watchlist entry',
                data: []
            };
        }
    }
}

export const watchlistService = new WatchlistService();
export default watchlistService;

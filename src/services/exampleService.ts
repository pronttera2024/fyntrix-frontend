import axiosInstance from "../utils/axiosInstance";

// Example service using the axios instance with automatic token refresh
export class ExampleAPI {
  // Example GET request
  static async getData() {
    try {
      const response = await axiosInstance.get('/v1/data');
      return response.data;
    } catch (error) {
      console.error('Get data error:', error);
      throw error;
    }
  }

  // Example POST request
  static async createData(data: any) {
    try {
      const response = await axiosInstance.post('/v1/data', data);
      return response.data;
    } catch (error) {
      console.error('Create data error:', error);
      throw error;
    }
  }

  // Example PUT request
  static async updateData(id: string, data: any) {
    try {
      const response = await axiosInstance.put(`/v1/data/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update data error:', error);
      throw error;
    }
  }

  // Example DELETE request
  static async deleteData(id: string) {
    try {
      const response = await axiosInstance.delete(`/v1/data/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete data error:', error);
      throw error;
    }
  }
}

export default ExampleAPI;

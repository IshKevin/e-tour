// Simple utility service for weather, currency, and location services
export const utilityService = {
  // Get weather information
  async getWeatherInfo(location: string) {
    try {
      // Mock weather data - in production, integrate with weather API
      const mockWeatherData = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
        condition: ['sunny', 'cloudy', 'rainy', 'partly-cloudy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
        windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
        forecast: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: ['sunny', 'cloudy', 'rainy', 'partly-cloudy'][Math.floor(Math.random() * 4)]
        }))
      };

      return mockWeatherData;
    } catch (error) {
      console.error('Error fetching weather info:', error);
      throw error;
    }
  },

  // Get currency exchange rates
  async getCurrencyRates(baseCurrency: string = 'USD') {
    try {
      // Mock currency data - in production, integrate with currency API
      const mockRates = {
        baseCurrency,
        rates: {
          USD: 1.0,
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.0,
          CAD: 1.25,
          AUD: 1.35,
          CHF: 0.92,
          CNY: 6.45,
          INR: 74.5,
          BRL: 5.2
        },
        lastUpdated: new Date().toISOString()
      };

      return mockRates;
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      throw error;
    }
  },

  // Convert currency
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    try {
      const rates = await this.getCurrencyRates(fromCurrency);
      const rate = rates.rates[toCurrency as keyof typeof rates.rates] || 1;
      
      return {
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: rate,
        convertedAmount: (amount * rate).toFixed(2),
        lastUpdated: rates.lastUpdated
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  },

  // Get location suggestions
  async getLocationSuggestions(query: string) {
    try {
      // Mock location data - in production, integrate with maps API
      const mockLocations = [
        { name: 'Paris, France', country: 'France', coordinates: { lat: 48.8566, lng: 2.3522 } },
        { name: 'Tokyo, Japan', country: 'Japan', coordinates: { lat: 35.6762, lng: 139.6503 } },
        { name: 'New York, USA', country: 'United States', coordinates: { lat: 40.7128, lng: -74.0060 } },
        { name: 'London, UK', country: 'United Kingdom', coordinates: { lat: 51.5074, lng: -0.1278 } },
        { name: 'Sydney, Australia', country: 'Australia', coordinates: { lat: -33.8688, lng: 151.2093 } },
        { name: 'Dubai, UAE', country: 'United Arab Emirates', coordinates: { lat: 25.2048, lng: 55.2708 } },
        { name: 'Rome, Italy', country: 'Italy', coordinates: { lat: 41.9028, lng: 12.4964 } },
        { name: 'Barcelona, Spain', country: 'Spain', coordinates: { lat: 41.3851, lng: 2.1734 } }
      ];

      const filteredLocations = mockLocations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.country.toLowerCase().includes(query.toLowerCase())
      );

      return {
        query,
        suggestions: filteredLocations.slice(0, 5),
        totalResults: filteredLocations.length
      };
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      throw error;
    }
  },

  // Get timezone information
  async getTimezoneInfo(location: string) {
    try {
      // Mock timezone data - in production, integrate with timezone API
      const mockTimezones = {
        'Paris': { timezone: 'Europe/Paris', offset: '+01:00', currentTime: new Date().toISOString() },
        'Tokyo': { timezone: 'Asia/Tokyo', offset: '+09:00', currentTime: new Date().toISOString() },
        'New York': { timezone: 'America/New_York', offset: '-05:00', currentTime: new Date().toISOString() },
        'London': { timezone: 'Europe/London', offset: '+00:00', currentTime: new Date().toISOString() },
        'Sydney': { timezone: 'Australia/Sydney', offset: '+11:00', currentTime: new Date().toISOString() }
      };

      const locationKey = Object.keys(mockTimezones).find(key => 
        location.toLowerCase().includes(key.toLowerCase())
      ) || 'London';

      return {
        location,
        ...mockTimezones[locationKey as keyof typeof mockTimezones]
      };
    } catch (error) {
      console.error('Error fetching timezone info:', error);
      throw error;
    }
  }
};

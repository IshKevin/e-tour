import { Request, Response } from 'express';
import { utilityService } from '../../services/utility.service';
import { successResponse, errorResponse } from '../../utils/response';

export const utilityController = {
  // GET /api/utils/weather - Get weather info
  async getWeather(req: Request, res: Response): Promise<Response> {
    try {
      const location = req.query.location as string;
      if (!location) {
        return errorResponse(res, 400, 'Location parameter is required', null, { parameter: 'location' });
      }

      const weatherData = await utilityService.getWeatherInfo(location);
      return successResponse(res, 200, 'Weather information retrieved successfully', weatherData);
    } catch (error) {
      return errorResponse(res, 500, 'Unable to fetch weather information', error);
    }
  },

  // GET /api/utils/currency - Get currency rates
  async getCurrencyRates(req: Request, res: Response): Promise<Response> {
    try {
      const baseCurrency = req.query.base as string || 'USD';
      const rates = await utilityService.getCurrencyRates(baseCurrency);
      return successResponse(res, 200, 'Currency rates retrieved successfully', rates);
    } catch (error) {
      return errorResponse(res, 500, 'Unable to fetch currency rates', error);
    }
  },

  // GET /api/utils/currency/convert - Convert currency
  async convertCurrency(req: Request, res: Response): Promise<Response> {
    try {
      const amount = parseFloat(req.query.amount as string);
      const from = req.query.from as string;
      const to = req.query.to as string;

      if (!amount || !from || !to) {
        return errorResponse(res, 400, 'Amount, from, and to parameters are required', null);
      }

      const conversion = await utilityService.convertCurrency(amount, from, to);
      return successResponse(res, 200, 'Currency converted successfully', conversion);
    } catch (error) {
      return errorResponse(res, 500, 'Unable to convert currency', error);
    }
  },

  // GET /api/utils/locations - Get location suggestions
  async getLocationSuggestions(req: Request, res: Response): Promise<Response> {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return errorResponse(res, 400, 'Query parameter must be at least 2 characters', null);
      }

      const suggestions = await utilityService.getLocationSuggestions(query);
      return successResponse(res, 200, 'Location suggestions retrieved successfully', suggestions);
    } catch (error) {
      return errorResponse(res, 500, 'Unable to fetch location suggestions', error);
    }
  },

  // GET /api/utils/timezone - Get timezone info
  async getTimezoneInfo(req: Request, res: Response): Promise<Response> {
    try {
      const location = req.query.location as string;
      if (!location) {
        return errorResponse(res, 400, 'Location parameter is required', null);
      }

      const timezoneInfo = await utilityService.getTimezoneInfo(location);
      return successResponse(res, 200, 'Timezone information retrieved successfully', timezoneInfo);
    } catch (error) {
      return errorResponse(res, 500, 'Unable to fetch timezone information', error);
    }
  }
};

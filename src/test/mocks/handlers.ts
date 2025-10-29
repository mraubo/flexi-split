import { http, HttpResponse } from 'msw';

// Define handlers for mocking API endpoints
export const handlers = [
  // Example handlers - customize based on your API endpoints
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Add more handlers as needed for your API endpoints
  // http.get('/api/settlements', () => {
  //   return HttpResponse.json([]);
  // }),
];


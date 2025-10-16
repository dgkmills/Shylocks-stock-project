// Netlify Function to fetch multiple stock prices simultaneously
// The API Key is sourced securely from Netlify Environment Variables.
const API_KEY = process.env.FINNHUB_API_KEY;

const TICKERS = ["AMZN", "AAPL", "NVDA", "TSLA", "GOOG", "META"];
// Using Finnhub's Quote API (data.c is the current price)
const FINNHUB_QUOTE_URL = (symbol) => `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;


exports.handler = async (event, context) => {
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "FINNHUB_API_KEY is missing in Netlify Environment Variables. Please set it." }),
        };
    }

    try {
        // Fetch all six stock quotes in parallel for maximum speed
        const fetchPromises = TICKERS.map(ticker => 
            fetch(FINNHUB_QUOTE_URL(ticker))
                .then(res => res.json())
                .then(data => ({ ticker, price: data.c })) 
                .catch(err => {
                    console.error(`Error fetching ${ticker}:`, err);
                    return { ticker, price: null, error: 'API Fetch Failed' };
                })
        );

        const results = await Promise.all(fetchPromises);
        
        // Consolidate results into the required map format for the frontend
        const priceMap = results.reduce((acc, curr) => {
            if (curr.price !== null) {
                acc[curr.ticker] = curr.price;
            }
            return acc;
        }, {});

        return {
            statusCode: 200,
            headers: {
                // IMPORTANT: Instruct Netlify to cache this function's result for 60 seconds (1 minute).
                'Cache-Control': 'public, max-age=60, s-maxage=60',
            },
            body: JSON.stringify(priceMap),
        };
    } catch (error) {
        console.error('Netlify Function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Serverless function execution failed.' }),
        };
    }
};

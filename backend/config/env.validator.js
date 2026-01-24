const validateEnv = () => {
    if (process.env.NODE_ENV === 'test') return;

    const requiredEnvVars = [
        'NODE_ENV',
        'MONGODB_URI',
        'JWT_SECRET',
        'JWT_EXPIRE',
        'FRONTEND_URL'
    ];

    const missingVars = [];
    const invalidVars = [];

    // Required variables
    requiredEnvVars.forEach((key) => {
        if (!process.env[key]) {
            missingVars.push(key);
        }
    });

    // NODE_ENV
    if (
        process.env.NODE_ENV &&
        !['development', 'production', 'test'].includes(process.env.NODE_ENV)
    ) {
        invalidVars.push({
            name: 'NODE_ENV',
            message: 'Must be one of: development, production, test',
        });
    }

    // PORT (optional)
    if (process.env.PORT && isNaN(Number(process.env.PORT))) {
        invalidVars.push({
            name: 'PORT',
            message: 'Must be a valid number',
        });
    }

    // JWT_SECRET
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        invalidVars.push({
            name: 'JWT_SECRET',
            message: 'Must be at least 32 characters long',
        });
    }

    // JWT_EXPIRE
    if (
        process.env.JWT_EXPIRE &&
        !/^\d+(s|m|h|d)$/.test(process.env.JWT_EXPIRE)
    ) {
        invalidVars.push({
            name: 'JWT_EXPIRE',
            message: 'Must be a valid time format (e.g. 15m, 1h, 7d)',
        });
    }

    // MongoDB URI
    if (
        process.env.MONGODB_URI &&
        !/^mongodb(\+srv)?:\/\//.test(process.env.MONGODB_URI)
    ) {
        invalidVars.push({
            name: 'MONGODB_URI',
            message: 'Must be a valid MongoDB connection string',
        });
    }

    // FRONTEND_URL(s)
    if (process.env.FRONTEND_URL) {
        const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim());
        urls.forEach((url) => {
            try {
                new URL(url);
            } catch {
                invalidVars.push({
                    name: 'FRONTEND_URL',
                    message: `Invalid URL: ${url}`,
                });
            }
        });
    }

    if (missingVars.length || invalidVars.length) {
        if (missingVars.length) {
            console.error('❌ Missing environment variables:');
            missingVars.forEach(v => console.error(`   - ${v}`));
        }

        if (invalidVars.length) {
            console.error('❌ Invalid environment variables:');
            invalidVars.forEach(({ name, message }) =>
                console.error(`   - ${name}: ${message}`)
            );
        }

        console.error('\n📋 Check your .env file or deployment configuration.\n');
        process.exit(1);
    }

    console.log('✅ Environment variables validated successfully');
};

module.exports = validateEnv;
